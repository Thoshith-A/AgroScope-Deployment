import { Server } from 'socket.io';

// In-memory store (replace with MongoDB later)
const provisions = [];
const connectedFarmers = new Map(); // farmerId → socketId
const connectedStartups = new Map(); // startupId → socketId

export function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: true, // allow all (dev + production)
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('register', ({ role, userId, name }) => {
      socket.data.role = role;
      socket.data.userId = userId;
      socket.data.name = name || 'User';

      if (role === 'farmer') {
        connectedFarmers.set(userId, socket.id);
        socket.join('farmers');
        console.log(`Farmer ${socket.data.name} connected`);
        const myProvisions = provisions.filter((p) => p.farmerId === userId);
        socket.emit('my_provisions', myProvisions);
      } else if (role === 'startup') {
        connectedStartups.set(userId, socket.id);
        socket.join('startups');
        console.log(`Startup ${socket.data.name} connected`);
        socket.emit('all_provisions', provisions);
      }
    });

    socket.on('new_provision', (data) => {
      const provision = {
        id: `PROV_${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        farmerId: socket.data.userId,
        farmerName: socket.data.name,
        wasteType: data.wasteType,
        quantityTons: data.quantityTons,
        pricePerKg: data.pricePerKg ?? 0,
        grade: data.grade || 'B',
        moisture: data.moisture ?? 0,
        location: data.location,
        description: data.description,
        upiId: data.upiId,
        imageUrl: data.imageUrl || null,
        status: 'pending',
        decisions: {},
        createdAt: new Date().toISOString(),
        syncedAt: new Date().toISOString(),
      };
      provisions.push(provision);
      console.log(`New provision: ${provision.id}`);

      socket.emit('provision_saved', {
        success: true,
        provisionId: provision.id,
        message: 'Synced to all startups!',
      });

      io.to('startups').emit('provision_synced', {
        provision,
        farmerName: socket.data.name,
        timestamp: new Date().toISOString(),
      });
      console.log(`Provision ${provision.id} synced to ${connectedStartups.size} startups`);
    });

    socket.on('accept_provision', ({ provisionId, startupId, startupName, message }) => {
      const prov = provisions.find((p) => p.id === provisionId);
      if (!prov) return;
      prov.decisions[startupId] = {
        status: 'accepted',
        startupName,
        message: message || 'Accepted',
        decidedAt: new Date().toISOString(),
      };
      const anyAccepted = Object.values(prov.decisions).some((d) => d.status === 'accepted');
      if (anyAccepted) prov.status = 'accepted';

      const farmerSocketId = connectedFarmers.get(prov.farmerId);
      const notif = {
        type: 'accepted',
        provisionId,
        wasteType: prov.wasteType,
        quantityTons: prov.quantityTons,
        startupName,
        message: message || `${startupName} accepted your ${prov.wasteType} provision!`,
        timestamp: new Date().toISOString(),
      };
      if (farmerSocketId) {
        io.to(farmerSocketId).emit('provision_accepted', notif);
      }
      io.to('startups').emit('provision_updated', { provision: prov });
      console.log(`Provision ${provisionId} accepted by ${startupName}`);
    });

    socket.on('reject_provision', ({ provisionId, startupId, startupName, reason }) => {
      const prov = provisions.find((p) => p.id === provisionId);
      if (!prov) return;
      prov.decisions[startupId] = {
        status: 'rejected',
        startupName,
        reason: reason || 'Not required',
        decidedAt: new Date().toISOString(),
      };
      const decisions = Object.values(prov.decisions);
      const hasAccepted = decisions.some((d) => d.status === 'accepted');
      if (!hasAccepted && decisions.length > 0) {
        prov.status = 'rejected';
      }

      const farmerSocketId = connectedFarmers.get(prov.farmerId);
      const notif = {
        type: 'rejected',
        provisionId,
        wasteType: prov.wasteType,
        quantityTons: prov.quantityTons,
        startupName,
        reason: reason || 'Not required',
        message: `${startupName} rejected your ${prov.wasteType} provision. Reason: ${reason || 'Not required'}`,
        timestamp: new Date().toISOString(),
      };
      if (farmerSocketId) {
        io.to(farmerSocketId).emit('provision_rejected', notif);
      }
      io.to('startups').emit('provision_updated', { provision: prov });
    });

    socket.on('update_provision', (data) => {
      const idx = provisions.findIndex(
        (p) => p.id === data.provisionId && p.farmerId === socket.data.userId
      );
      if (idx === -1) return;
      const updated = {
        ...provisions[idx],
        ...data.updates,
        syncedAt: new Date().toISOString(),
        status: 'pending',
        decisions: {},
      };
      provisions[idx] = updated;
      io.to('startups').emit('provision_updated', {
        provision: updated,
        isUpdate: true,
        farmerName: socket.data.name,
      });
      socket.emit('provision_update_confirmed', { success: true, provision: updated });
    });

    socket.on('get_provisions', () => {
      socket.emit('all_provisions', provisions);
    });

    socket.on('disconnect', () => {
      const { role, userId } = socket.data || {};
      if (role === 'farmer') connectedFarmers.delete(userId);
      else if (role === 'startup') connectedStartups.delete(userId);
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

/**
 * Sync a provision created via API (POST /api/provisions) into the socket store
 * and notify all startups. Ensures farmer inventory (API) and startup inventory (socket) stay in sync.
 */
export function syncProvisionFromApi(io, payload) {
  if (!io || !payload) return;
  const { _id, userId, wasteType, quantityTons, location, price, createdAt } = payload;
  const farmerName = payload.farmerName || payload.userId || 'Farmer';
  const provision = {
    id: _id,
    farmerId: userId,
    farmerName,
    wasteType: wasteType || 'Other',
    quantityTons: Number(quantityTons) || 0,
    pricePerKg: typeof price === 'number' ? price : 0,
    grade: payload.wasteQualityGrade || 'B',
    moisture: typeof payload.moisturePercentage === 'number' ? payload.moisturePercentage : 0,
    location: location || 'Not specified',
    description: payload.description || '',
    upiId: payload.upiId || '',
    imageUrl: payload.imageUrl || null,
    status: 'pending',
    decisions: {},
    createdAt: createdAt || new Date().toISOString(),
    syncedAt: new Date().toISOString(),
  };
  provisions.push(provision);
  io.to('startups').emit('provision_synced', {
    provision,
    farmerName,
    timestamp: new Date().toISOString(),
  });
  const farmerSocketId = connectedFarmers.get(userId);
  if (farmerSocketId) {
    io.to(farmerSocketId).emit('provision_saved', {
      success: true,
      provisionId: provision.id,
      message: 'Synced to all startups!',
    });
  }
  console.log(`Provision ${provision.id} synced from API to startups`);
}

/**
 * Convert API-format provision (from provisions store / DEMO_PROVISIONS) to socket format.
 */
function apiProvisionToSocketFormat(p) {
  return {
    id: p._id,
    farmerId: p.userId,
    farmerName: p.farmerName || p.userId || 'Farmer',
    wasteType: p.wasteType || 'Other',
    quantityTons: Number(p.quantityTons) || 0,
    pricePerKg: typeof p.price === 'number' ? p.price : (p.farmer_price ?? 0),
    grade: p.wasteQualityGrade || 'B',
    moisture: typeof p.moisturePercentage === 'number' ? p.moisturePercentage : 0,
    location: p.location || 'Not specified',
    description: p.description || '',
    upiId: p.upiId || '',
    imageUrl: p.imageUrl || null,
    status: p.status || 'pending',
    decisions: {},
    createdAt: p.createdAt || new Date().toISOString(),
    syncedAt: p.createdAt || new Date().toISOString(),
  };
}

/**
 * Seed in-memory socket provisions from a list (e.g. loaded from file at startup).
 * Call after initSocket so startup dashboard and real-time sync see persisted data.
 */
export function seedProvisionsFromList(apiFormatList) {
  if (!Array.isArray(apiFormatList)) return;
  provisions.length = 0;
  apiFormatList.forEach((p) => provisions.push(apiProvisionToSocketFormat(p)));
  console.log(`Socket provisions seeded: ${provisions.length} from store`);
}

export { provisions };
