// ============================================
// RUD STORAGE SYNC - localStorage → Supabase
// ============================================

// Este arquivo intercepta localStorage e sincroniza com Supabase
// Mantém compatibilidade com o código original do Rud

const STORAGE_SYNC_ENABLED = false; // TODO: Ativar quando Supabase estiver integrado

const originalSetItem = Storage.prototype.setItem;
const originalGetItem = Storage.prototype.getItem;

Storage.prototype.setItem = function(key, value) {
  // Por enquanto, apenas salva no localStorage
  // Em breve: sincronizará com Supabase
  originalSetItem.call(this, key, value);

  if (STORAGE_SYNC_ENABLED) {
    // TODO: Chamar função para sincronizar com Supabase
    // syncToSupabase(key, value);
  }
};

Storage.prototype.getItem = function(key) {
  // Por enquanto, apenas lê do localStorage
  // Em breve: lê do Supabase em tempo real
  return originalGetItem.call(this, key);
};

// Log para confirmar que o sync está ativo
console.log('Rud Storage Sync loaded. Status:', STORAGE_SYNC_ENABLED ? 'ENABLED' : 'DISABLED (localStorage only)');
