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
  // GET all routes or single route with locations
  async GET(req, res) {
    const err = checkSqlConnection(res);
    if (err) return err;

    const { id } = req.query;

    // GET single route with its locations
    if (id) {
      try {
        const route = await sql(`
          SELECT id, route, shift, warehouse, description, "createdAt", "updatedAt" 
          FROM "Route" 
          WHERE id = $1
        `, [id]);
        
        const locations = await sql(`
          SELECT id, "routeId", location, code, no, delivery, "powerMode",
                 latitude, longitude, description, images, address,
                 "websiteLink", "qrCodeImageUrl", "qrCodeDestinationUrl",
                 "createdAt", "updatedAt"
          FROM "Location"
          WHERE "routeId" = $1
          ORDER BY "createdAt" DESC
        `, [id]);
        
        if (route.length === 0) {
          return res.status(404).json({ error: 'Route not found' });
        }
        
        return res.status(200).json({ route: route[0], locations });
      } catch (error) {
        console.error('Error fetching route:', error);
        return res.status(500).json({ error: error.message });
      }
    }

    // GET all routes
    try {
      const result = await sql(`
        SELECT id, route, shift, warehouse, description, "createdAt", "updatedAt" 
        FROM "Route" 
        ORDER BY "createdAt" DESC
      `);
      res.status(200).json(result);
    } catch (error) {
      console.error('Error fetching routes:', error);
      res.status(500).json({ 
        error: error.message || 'Failed to fetch routes',
        code: error.code
      });
    }
  },

  // POST create route
  async POST(req, res) {
    const err = checkSqlConnection(res);
    if (err) return err;

    const { route, shift, warehouse, description } = req.body;

    // Log request for debugging
    console.log('POST /api/routes - Request body:', req.body);

    // Check required fields (handle empty strings too)
    const missingFields = [];
    if (!route || typeof route !== 'string' || route.trim() === '') missingFields.push('route');
    if (!shift || typeof shift !== 'string' || shift.trim() === '') missingFields.push('shift');
    if (!warehouse || typeof warehouse !== 'string' || warehouse.trim() === '') missingFields.push('warehouse');

    if (missingFields.length > 0) {
      return res.status(400).json({ 
        error: 'Missing or empty required fields',
        required: ['route', 'shift', 'warehouse'],
        missing: missingFields,
        received: req.body,
        hint: 'All fields must have non-empty values'
      });
    }

    try {
      const result = await sql(`
        INSERT INTO "Route" (route, shift, warehouse, description, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        RETURNING id, route, shift, warehouse, description, "createdAt", "updatedAt"
      `, [route, shift, warehouse, description || null]);
      
      res.status(201).json(result[0]);
    } catch (error) {
      console.error('Error creating route:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // PUT update route (single or batch)
  async PUT(req, res) {
    const err = checkSqlConnection(res);
    if (err) return err;

    const { id } = req.query;
    const { routes, route, shift, warehouse, description } = req.body;

    // Batch update mode (multiple routes)
    if (routes && Array.isArray(routes)) {
      try {
        const updated = [];
        const failed = [];

        for (const rt of routes) {
          try {
            const result = await sql(`
              UPDATE "Route"
              SET route = COALESCE($1, route),
                  shift = COALESCE($2, shift),
                  warehouse = COALESCE($3, warehouse),
                  description = COALESCE($4, description),
                  "updatedAt" = NOW()
              WHERE id = $5
              RETURNING id, route, shift, warehouse, description, "createdAt", "updatedAt"
            `, [rt.route || null, rt.shift || null, rt.warehouse || null, 
                rt.description || null, rt.id]);
            
            if (result.length > 0) {
              updated.push(result[0]);
            }
          } catch (error) {
            console.error(`Error updating route ${rt.id}:`, error);
            failed.push({ id: rt.id, error: error.message });
          }
        }

        return res.status(200).json({ 
          updated: updated.length, 
          failed: failed.length,
          routes: updated 
        });
      } catch (error) {
        console.error('Error in batch update:', error);
        return res.status(500).json({ error: error.message });
      }
    }

    // Single update mode (legacy)
    try {
      const result = await sql(`
        UPDATE "Route"
        SET route = COALESCE($1, route),
            shift = COALESCE($2, shift),
            warehouse = COALESCE($3, warehouse),
            description = COALESCE($4, description),
            "updatedAt" = NOW()
        WHERE id = $5
        RETURNING id, route, shift, warehouse, description, "createdAt", "updatedAt"
      `, [route || null, shift || null, warehouse || null, description || null, id]);
      
      if (result.length === 0) {
        return res.status(404).json({ error: 'Route not found' });
      }
      
      res.status(200).json(result[0]);
    } catch (error) {
      console.error('Error updating route:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // DELETE route
  async DELETE(req, res) {
    const err = checkSqlConnection(res);
    if (err) return err;

    // Accept id from either query params or body (for compatibility)
    const id = req.query.id || req.body?.id;

    try {
      // Delete locations first (foreign key constraint)
      await sql('DELETE FROM "Location" WHERE "routeId" = $1', [id]);
      
      // Delete route
      const result = await sql('DELETE FROM "Route" WHERE id = $1 RETURNING id', [id]);
      
      if (result.length === 0) {
        return res.status(404).json({ error: 'Route not found' });
      }
      
      res.status(200).json({ success: true, id });
    } catch (error) {
      console.error('Error deleting route:', error);
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
