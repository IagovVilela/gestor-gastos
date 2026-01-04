// Wrapper para API com cache automático
import api from './api';
import { requestCache } from './cache';

interface CacheOptions {
  ttl?: number; // Time to live em milissegundos
  key?: string; // Chave customizada para o cache
  skipCache?: boolean; // Pular cache mesmo se existir
}

export const cachedApi = {
  get: async <T = any>(
    url: string,
    config?: any,
    cacheOptions?: CacheOptions
  ): Promise<{ data: T }> => {
    const cacheKey = cacheOptions?.key || `GET:${url}:${JSON.stringify(config?.params || {})}`;

    // Se não deve usar cache, fazer requisição direta
    if (cacheOptions?.skipCache) {
      const response = await api.get<T>(url, config);
      return response;
    }

    // Verificar cache
    const cached = requestCache.get<T>(cacheKey);
    if (cached !== null) {
      return { data: cached };
    }

    // Fazer requisição
    const response = await api.get<T>(url, config);
    
    // Salvar no cache
    requestCache.set(cacheKey, response.data, cacheOptions?.ttl);

    return response;
  },

  post: api.post.bind(api),
  patch: api.patch.bind(api),
  put: api.put.bind(api),
  delete: api.delete.bind(api),
};

// Função para invalidar cache
export const invalidateCache = (pattern?: string) => {
  if (pattern) {
    // Invalidar apenas entradas que correspondem ao padrão
    const keys = Array.from(requestCache['cache'].keys());
    keys.forEach((key) => {
      if (key.includes(pattern)) {
        requestCache.delete(key);
      }
    });
  } else {
    // Limpar todo o cache
    requestCache.clear();
  }
};

