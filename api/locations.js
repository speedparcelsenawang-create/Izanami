import { neon } from '@neondatabase/serverless';

// Initialize Neon connection
let sql;
try {
  sql = neon(process.env.DATABASE_URL || process.env.VITE_DATABASE_URL);
} catch (error) {
  console.error('Failed to initialize Neon connection:', error);
}

// Utility to check if sql is ready
function checkSqlConnection(res) {
  if (!sql) {
    return res.status(500).json({ 
      error: 'Database not connected',
      hint: 'Check DATABASE_URL environment variable'
    });
  }
  return null;
}

// Route handlers
const handlers = {
  // GET all locations or single location
  async GET(req, res) {
    const err = checkSqlConnection(res);
    if (err) return err;

    const { id, routeId } = req.query;

    // GET single location
    if (id) {
      try {
        const result = await sql(`
          SELECT id, "routeId", location, code, no, delivery, "powerMode", 
                 latitude, longitude, description, images, address, 
                 "websiteLink", "qrCodeImageUrl", "qrCodeDestinationUrl",
                 "createdAt", "updatedAt"
          FROM "Location"
          WHERE id = $1
        `, [id]);
        
        if (result.length === 0) {
          return res.status(404).json({ error: 'Location not found' });
        }
        
        return res.status(200).json(result[0]);
      } catch (error) {
        console.error('Error fetching location:', error);
        return res.status(500).json({ error: error.message });
      }
    }

    // GET locations by routeId
    if (routeId) {
      try {
        const result = await sql(`
          SELECT id, "routeId", location, code, no, delivery, "powerMode",
                 latitude, longitude, description, images, address,
                 "websiteLink", "qrCodeImageUrl", "qrCodeDestinationUrl",
                 "createdAt", "updatedAt"
          FROM "Location"
          WHERE "routeId" = $1
          ORDER BY "createdAt" DESC
        `, [routeId]);
        
        return res.status(200).json(result);
      } catch (error) {
        console.error('Error fetching locations by routeId:', error);
        return res.status(500).json({ error: error.message });
      }
    }

    // GET all locations
    try {
      const result = await sql(`
        SELECT id, "routeId", location, code, no, delivery, "powerMode",
               latitude, longitude, description, images, address,
               "websiteLink", "qrCodeImageUrl", "qrCodeDestinationUrl",
               "createdAt", "updatedAt"
        FROM "Location"
        ORDER BY "createdAt" DESC
      `);
      res.status(200).json(result);
    } catch (error) {
      console.error('Error fetching locations:', error);
      res.status(500).json({ 
        error: error.message || 'Failed to fetch locations',
        code: error.code
      });
    }
  },

  // POST create location or add image
  async POST(req, res) {
    const err = checkSqlConnection(res);
    if (err) return err;

    const { id } = req.query;
    const { routeId, location, code, no, delivery, powerMode, address, 
            latitude, longitude, description, imageUrl, websiteLink,
            qrCodeImageUrl, qrCodeDestinationUrl } = req.body;

    // POST add image to location
    if (id && imageUrl) {
      try {
        const result = await sql(`
          UPDATE "Location"
          SET images = array_append(COALESCE(images, '{}'), $1),
              "updatedAt" = NOW()
          WHERE id = $2
          RETURNING id, "routeId", location, code, no, delivery, "powerMode",
                    latitude, longitude, description, images, address,
                    "websiteLink", "qrCodeImageUrl", "qrCodeDestinationUrl",
                    "createdAt", "updatedAt"
        `, [imageUrl, id]);
        
        if (result.length === 0) {
          return res.status(404).json({ error: 'Location not found' });
        }
        
        return res.status(200).json(result[0]);
      } catch (error) {
        console.error('Error adding image:', error);
        return res.status(500).json({ error: error.message });
      }
    }

    // POST create location
    if (!routeId || !location) {
      return res.status(400).json({ 
        error: 'routeId and location are required' 
      });
    }

    // Validate routeId is a reasonable number
    const routeIdNum = parseInt(routeId);
    if (isNaN(routeIdNum) || routeIdNum < 0) {
      return res.status(400).json({ 
        error: 'Invalid routeId: must be a valid positive number',
        received: routeId
      });
    }

    try {
      const result = await sql(`
        INSERT INTO "Location" (
          "routeId", location, code, no, delivery, "powerMode", 
          latitude, longitude, description, images, address,
          "websiteLink", "qrCodeImageUrl", "qrCodeDestinationUrl",
          "createdAt", "updatedAt"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
        RETURNING id, "routeId", location, code, no, delivery, "powerMode",
                  latitude, longitude, description, images, address,
                  "websiteLink", "qrCodeImageUrl", "qrCodeDestinationUrl",
                  "createdAt", "updatedAt"
      `, [routeId, location, code || null, no || null, delivery || null, 
          powerMode || null, latitude || null, longitude || null, 
          description || null, [], address || null, websiteLink || null,
          qrCodeImageUrl || null, qrCodeDestinationUrl || null]);
      
      res.status(201).json(result[0]);
    } catch (error) {
      console.error('Error creating location:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // PUT update location (single or batch)
  async PUT(req, res) {
    const err = checkSqlConnection(res);
    if (err) return err;

    const { id } = req.query;
    const { locations, location, code, no, delivery, powerMode, address,
            latitude, longitude, description, websiteLink,
            qrCodeImageUrl, qrCodeDestinationUrl } = req.body;

    // Batch update mode (multiple locations)
    if (locations && Array.isArray(locations)) {
      try {
        const updated = [];
        const failed = [];

        for (const loc of locations) {
          try {
            const result = await sql(`
              UPDATE "Location"
              SET location = COALESCE($1, location),
                  code = COALESCE($2, code),
                  no = COALESCE($3, no),
                  delivery = COALESCE($4, delivery),
                  "powerMode" = COALESCE($5, "powerMode"),
                  latitude = COALESCE($6, latitude),
                  longitude = COALESCE($7, longitude),
                  description = COALESCE($8, description),
                  address = COALESCE($9, address),
                  "websiteLink" = COALESCE($10, "websiteLink"),
                  "qrCodeImageUrl" = COALESCE($11, "qrCodeImageUrl"),
                  "qrCodeDestinationUrl" = COALESCE($12, "qrCodeDestinationUrl"),
                  "updatedAt" = NOW()
              WHERE id = $13
              RETURNING id, "routeId", location, code, no, delivery, "powerMode",
                        latitude, longitude, description, images, address,
                        "websiteLink", "qrCodeImageUrl", "qrCodeDestinationUrl",
                        "createdAt", "updatedAt"
            `, [loc.location || null, loc.code || null, loc.no || null, 
                loc.delivery || null, loc.powerMode || null, 
                loc.latitude || null, loc.longitude || null, 
                loc.description || null, loc.address || null, 
                loc.websiteLink || null, loc.qrCodeImageUrl || null, 
                loc.qrCodeDestinationUrl || null, loc.id]);
            
            if (result.length > 0) {
              updated.push(result[0]);
            }
          } catch (error) {
            console.error(`Error updating location ${loc.id}:`, error);
            failed.push({ id: loc.id, error: error.message });
          }
        }

        return res.status(200).json({ 
          updated: updated.length, 
          failed: failed.length,
          locations: updated 
        });
      } catch (error) {
        console.error('Error in batch update:', error);
        return res.status(500).json({ error: error.message });
      }
    }

    // Single update mode (legacy)
    try {
      const result = await sql(`
        UPDATE "Location"
        SET location = COALESCE($1, location),
            code = COALESCE($2, code),
            no = COALESCE($3, no),
            delivery = COALESCE($4, delivery),
            "powerMode" = COALESCE($5, "powerMode"),
            latitude = COALESCE($6, latitude),
            longitude = COALESCE($7, longitude),
            description = COALESCE($8, description),
            address = COALESCE($9, address),
            "websiteLink" = COALESCE($10, "websiteLink"),
            "qrCodeImageUrl" = COALESCE($11, "qrCodeImageUrl"),
            "qrCodeDestinationUrl" = COALESCE($12, "qrCodeDestinationUrl"),
            "updatedAt" = NOW()
        WHERE id = $13
        RETURNING id, "routeId", location, code, no, delivery, "powerMode",
                  latitude, longitude, description, images, address,
                  "websiteLink", "qrCodeImageUrl", "qrCodeDestinationUrl",
                  "createdAt", "updatedAt"
      `, [location || null, code || null, no || null, delivery || null,
          powerMode || null, latitude || null, longitude || null,
          description || null, address || null, websiteLink || null,
          qrCodeImageUrl || null, qrCodeDestinationUrl || null, id]);
      
      if (result.length === 0) {
        return res.status(404).json({ error: 'Location not found' });
      }
      
      res.status(200).json(result[0]);
    } catch (error) {
      console.error('Error updating location:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // DELETE location or image
  async DELETE(req, res) {
    const err = checkSqlConnection(res);
    if (err) return err;

    // Accept id from either query params or body (for compatibility)
    const id = req.query.id || req.body?.id;
    const { imageUrl } = req.query;

    // DELETE image from location
    if (imageUrl) {
      try {
        const result = await sql(`
          UPDATE "Location"
          SET images = array_remove(COALESCE(images, '{}'), $1),
              "updatedAt" = NOW()
          WHERE id = $2
          RETURNING id, "routeId", location, code, no, delivery, "powerMode",
                    latitude, longitude, description, images, address,
                    "websiteLink", "qrCodeImageUrl", "qrCodeDestinationUrl",
                    "createdAt", "updatedAt"
        `, [imageUrl, id]);
        
        if (result.length === 0) {
          return res.status(404).json({ error: 'Location not found' });
        }
        
        return res.status(200).json(result[0]);
      } catch (error) {
        console.error('Error deleting image:', error);
        return res.status(500).json({ error: error.message });
      }
    }

    // DELETE location
    try {
      const result = await sql('DELETE FROM "Location" WHERE id = $1 RETURNING id', [id]);
      
      if (result.length === 0) {
        return res.status(404).json({ error: 'Location not found' });
      }
      
      res.status(200).json({ success: true, id });
    } catch (error) {
      console.error('Error deleting location:', error);
      res.status(500).json({ error: error.message });
    }
  }
};

// Default export for Vercel
export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const method = req.method;
  
  if (!handlers[method]) {
    return res.status(405).json({ error: `Method ${method} not allowed` });
  }

  return handlers[method](req, res);
}
