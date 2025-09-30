import React, { useEffect, useState, useCallback } from 'react';
import { Search, Filter, Image as ImageIcon, Eye, RefreshCw, X, ChevronLeft, ChevronRight, WifiOff, AlertCircle, Clock, ServerCrash } from 'lucide-react';

// Lazy loading hook for images
const useIntersectionObserver = (options = {}) => {
  const [ref, setRef] = useState<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!ref) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.1, ...options });

    observer.observe(ref);

    return () => observer.disconnect();
  }, [ref, options]);

  return [setRef, isVisible] as const;
};

// Memoized ProductImage component
const ProductImage = React.memo(({ imageUrl, articleName }: { imageUrl: string, articleName: string }) => {
  const [imageRef, isVisible] = useIntersectionObserver();
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isVisible || !imageUrl || hasError || isLoaded) return;

    setIsLoading(true);
    const img = new Image();
    
    img.onload = () => {
      setIsLoaded(true);
      setIsLoading(false);
    };
    
    img.onerror = () => {
      setHasError(true);
      setIsLoading(false);
    };
    
    img.src = imageUrl;
  }, [isVisible, imageUrl, hasError, isLoaded]);

  if (hasError) {
    return (
      <div className="no-image" ref={imageRef}>
        <ImageIcon size={24} />
      </div>
    );
  }

  if (!isVisible || isLoading) {
    return (
      <div className="image-loading" ref={imageRef}>
        <div className="image-spinner"></div>
      </div>
    );
  }

  return (
    <img 
      src={imageUrl}
      alt={articleName}
      className="product-image"
      style={{ opacity: isLoaded ? 1 : 0 }}
      onLoad={() => setIsLoaded(true)}
    />
  );
});

// Memoized ArticleRow component
const ArticleRow = React.memo(({ 
  article, 
  onImageClick 
}: { 
  article: Article; 
  onImageClick: (article: Article) => void;
}) => {
  const imageUrl = getPosition1ImageUrl(article.fot_url);
  const hasMultipleImages = article.fot_url && article.fot_url.split(',').length > 1;
  const pvp = article.pre_net * 1.21;

  return (
    <tr className="table-row">
      <td className="table-cell table-cell-image">
        <div className="image-container">
          {imageUrl ? (
            <>
              <ProductImage imageUrl={imageUrl} articleName={article.name} />
              {hasMultipleImages && (
                <button 
                  className="view-more-images" 
                  onClick={() => onImageClick(article)}
                  title="Ver más imágenes"
                >
                  <Eye size={16} />
                </button>
              )}
            </>
          ) : (
            <div className="no-image">
              <ImageIcon size={24} />
            </div>
          )}
        </div>
      </td>
      <td className="table-cell">{article.ref}</td>
      <td className="table-cell">{article.sku_prv}</td>
      <td className="table-cell table-cell-name">{article.name}</td>
      <td className="table-cell">{formatNumber(article.stk_con)}</td>
      <td className="table-cell">{formatNumber(article.dep)}</td>
      <td className="table-cell">{formatNumber(article.pdt_rec)}</td>
      <td className="table-cell">{formatNumber(article.stk_con_ven)}</td>
      <td className="table-cell">{formatCurrency(article.cos_net)}</td>
      <td className="table-cell">{formatCurrency(pvp)}</td>
      <td className="table-cell">{formatPercentage(article.mar)}</td>
    </tr>
  );
});

// Helper functions moved outside component
const getPosition1ImageUrl = (fotUrl?: string): string | null => {
  if (!fotUrl) return null;
  
  const urls = fotUrl.split(',');
  const position1Image = urls.find(url => url.includes('_1_'));
  
  if (position1Image) {
    return position1Image.trim();
  } else if (urls.length > 0) {
    return urls[0].trim();
  }
  
  return null;
};

const getAllImageUrls = (fotUrl?: string): string[] => {
  if (!fotUrl) return [];
  
  return fotUrl.split(',')
    .map(url => url.trim())
    .filter(url => url.length > 0);
};

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('es-AR').format(num);
};

const formatCurrency = (num: number) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(num);
};

const formatPercentage = (num: number) => {
  return `${num.toFixed(2)}%`;
};

const getStockStatus = (stock: number) => {
  if (stock === 0) {
    return { text: 'Sin stock' };
  } else if (stock < 5) {
    return { text: 'Stock bajo' };
  } else {
    return { text: 'En stock' };
  }
};

interface Article {
  id: number;
  name: string;
  sku_prv: string;
  ref: string;
  dep: number;
  ven: number;
  pdt_rec: number;
  stk_con: number;
  stk_con_ven: number;
  cos_net: number;
  pre_net: number;
  mar: number;
  prv: number;
  fot_url?: string;
}

interface Provider {
  id: number;
  name: string;
  es_prv: boolean;
}

interface ArticlesResponse {
  count: number;
  total_count: number;
  art_prv_web_dis: Article[];
}

interface ProvidersResponse {
  count: number;
  total_count: number;
  ent_m: Provider[];
}

interface ArticlesProps {
  providerId: number;
  isAdmin?: boolean;
}

const Articles: React.FC<ArticlesProps> = ({ providerId, isAdmin = false }) => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [providerFilter, setProviderFilter] = useState<string>('');
  const [currentProviderId, setCurrentProviderId] = useState<number>(providerId);
  const [sortColumn, setSortColumn] = useState<keyof Article>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [articlesCache, setArticlesCache] = useState<Record<number, Article[]>>({});
  const [providersCache, setProvidersCache] = useState<Provider[]>([]);
  const [providersLoaded, setProvidersLoaded] = useState(false);
  const [availableProviders, setAvailableProviders] = useState<Provider[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 3000;

  // Async provider loading
  const fetchProviders = useCallback(async () => {
    if (!isAdmin || isOffline || providersLoaded) return;

    try {
      setLoadingProviders(true);
      
      const response = await fetch(
        'https://sygemat.com.ar/api-prod-prov/Sygemat_Dat_dat/v1/ent_m?filter[ID_ES_PRV]&page%5Bnumber%5D=page%5Bnumber%5D&page%5Bsize%5D=page%5Bsize%5D&api_key=f3MM4FeX',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(30000),
        }
      );

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`);
      }

      const data: ProvidersResponse = await response.json();
      
      if (data && Array.isArray(data.ent_m)) {
        setProvidersCache(data.ent_m);
        setProviders(data.ent_m);
        setProvidersLoaded(true);
      }
    } catch (err) {
      console.error('Error al cargar proveedores:', err);
      // No mostramos error al usuario para no interferir con la carga de artículos
    } finally {
      setLoadingProviders(false);
    }
  }, [isAdmin, isOffline, providersLoaded]);

  const fetchArticles = async (retry = false) => {
    // Check if we have cached articles for this provider
    if (articlesCache[currentProviderId] && !retry) {
      setArticles(articlesCache[currentProviderId]);
      setFilteredArticles(articlesCache[currentProviderId]);
      setLoading(false);
      return;
    }

    if (isOffline) {
      setError('No hay conexión a internet. Por favor, verifique su conexión.');
      setConnectionError('offline');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setConnectionError(null);
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-articles`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ proveedor: currentProviderId }),
          signal: AbortSignal.timeout(30000),
        }
      );

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`);
      }

      const data: ArticlesResponse = await response.json();
      
      if (!data || !Array.isArray(data.art_prv_web_dis)) {
        throw new Error('Formato de respuesta inválido');
      }
      
      const seenIds = new Set<number>();
      const uniqueArticles = data.art_prv_web_dis.filter(article => {
        if (article && article.id && !seenIds.has(article.id)) {
          seenIds.add(article.id);
          return true;
        }
        return false;
      });
      
      setArticles(uniqueArticles);
      setFilteredArticles(uniqueArticles);
      
      // Cache the articles for this provider
      setArticlesCache(prev => ({
        ...prev,
        [currentProviderId]: uniqueArticles
      }));
      
      setRetryCount(0);
    } catch (err) {
      const error = err as Error;
      let errorMessage = 'Error al cargar los artículos.';
      
      if (error.name === 'AbortError') {
        errorMessage = 'La conexión tardó demasiado tiempo. Por favor, intente nuevamente.';
        setConnectionError('timeout');
      } else if (error.message.includes('fetch')) {
        errorMessage = 'No se pudo conectar con el servidor. Verifique su conexión.';
        setConnectionError('network');
      } else if (error.message.includes('servidor')) {
        errorMessage = `Error del servidor. ${error.message}`;
        setConnectionError('server');
      } else {
        errorMessage = 'Error inesperado. Por favor, intente nuevamente.';
        setConnectionError('unknown');
      }

      setError(errorMessage);
      console.error('Error al cargar artículos:', error);

      if (retry && retryCount < MAX_RETRIES) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          fetchArticles(true);
        }, RETRY_DELAY);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load providers asynchronously after component mounts
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isAdmin && !providersLoaded) {
      // Load providers in background after a small delay
      const timer = setTimeout(() => {
        fetchProviders();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isAdmin, providersLoaded, fetchProviders]);
  useEffect(() => {
    fetchArticles(false);
  }, [currentProviderId]);

  // Update current provider ID when provider filter changes
  useEffect(() => {
    if (!isAdmin) {
      setCurrentProviderId(providerId);
    } else {
      // For admin, always use the original providerId unless we want to change provider
      setCurrentProviderId(providerId);
    }
  }, [isAdmin, providerId]);

  // Filter providers to show only those that have articles in current dataset
  useEffect(() => {
    if (!isAdmin || articles.length === 0 || providersCache.length === 0) {
      setAvailableProviders([]);
      return;
    }

    // Get unique provider IDs from articles
    const articleProviderIds = new Set(articles.map(article => article.prv));
    
    // Filter providers cache to only include those with articles
    const filtered = providersCache.filter(provider => 
      articleProviderIds.has(provider.id)
    );

    console.log('Debug - Provider IDs in articles:', Array.from(articleProviderIds));
    console.log('Debug - Filtered providers:', filtered.length);
    
    setAvailableProviders(filtered);
  }, [isAdmin, articles, providersCache]);

  const getProviderName = (providerId: number): string => {
    const provider = providersCache.find(p => p.id === providerId);
    return provider ? provider.name : `Proveedor ${providerId}`;
  };
  const handleRefresh = () => {
    setRefreshing(true);
    // Clear cache for current provider and force reload
    setArticlesCache(prev => {
      const newCache = { ...prev };
      delete newCache[currentProviderId];
      return newCache;
    });
    fetchArticles(true);
  };

  const ConnectionErrorState = () => {
    if (!connectionError) return null;

    let icon = <AlertCircle size={48} />;
    let title = 'Error de conexión';
    let message = 'Ha ocurrido un error inesperado.';
    let action = 'Intentar nuevamente';

    switch (connectionError) {
      case 'offline':
        icon = <WifiOff size={48} />;
        title = 'Sin conexión';
        message = 'No hay conexión a internet. Por favor, verifique su conexión y vuelva a intentar.';
        action = 'Verificar conexión';
        break;
      case 'timeout':
        icon = <Clock size={48} />;
        title = 'Tiempo de espera agotado';
        message = 'La conexión con el servidor está tardando demasiado. Por favor, intente nuevamente.';
        break;
      case 'network':
        icon = <WifiOff size={48} />;
        title = 'Error de red';
        message = 'No se pudo establecer conexión con el servidor. Verifique su conexión a internet.';
        break;
      case 'server':
        icon = <ServerCrash size={48} />;
        title = 'Error del servidor';
        message = 'El servidor no está respondiendo correctamente. Por favor, intente más tarde.';
        break;
    }

    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="text-secondary mb-4">
          {icon}
        </div>
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-gray-600 mb-4">{message}</p>
        {retryCount > 0 && retryCount < MAX_RETRIES && (
          <p className="text-sm text-gray-500 mb-4">
            Reintento {retryCount} de {MAX_RETRIES}...
          </p>
        )}
        <button
          onClick={() => fetchArticles(true)}
          className="bg-secondary text-white px-4 py-2 rounded-md hover:bg-secondary-dark transition-colors"
          disabled={loading || refreshing}
        >
          <RefreshCw size={16} className={`inline mr-2 ${loading || refreshing ? 'animate-spin' : ''}`} />
          {action}
        </button>
      </div>
    );
  };

  const handleSort = (column: keyof Article) => {
    if (sortColumn === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortOrder('asc');
    }
  };

  const getSortIndicator = (column: string) => {
    if (sortColumn !== column) return null;
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  const openImageModal = (article: Article) => {
    const urls = getAllImageUrls(article.fot_url);
    setSelectedArticle(article);
    setImageUrls(urls);
    setCurrentImageIndex(0);
    setShowImageModal(true);
  };

  const closeImageModal = () => {
    setShowImageModal(false);
    setSelectedArticle(null);
    setImageUrls([]);
  };

  const nextImage = () => {
    if (currentImageIndex < imageUrls.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
    }
  };

  const prevImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
    }
  };

  useEffect(() => {
    let result = [...articles];

    // Debug: Log para ver los datos reales
    if (isAdmin && articles.length > 0) {
      console.log('Debug - Primer artículo:', articles[0]);
      console.log('Debug - Campos disponibles:', Object.keys(articles[0]));
      console.log('Debug - Valores únicos de prv:', [...new Set(articles.map(a => a.prv))]);
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(
        article =>
          article.name.toLowerCase().includes(searchLower) ||
          article.id.toString().includes(searchLower) ||
          article.sku_prv.toLowerCase().includes(searchLower) ||
          article.ref.toLowerCase().includes(searchLower)
      );
    }

    // Filter by provider if admin and provider filter is set
    if (isAdmin && providerFilter && providerFilter !== '') {
      const selectedProviderId = parseInt(providerFilter);
      console.log('Debug - Filtrando por proveedor:', selectedProviderId);
      console.log('Debug - Artículos antes del filtro:', result.length);
      if (!isNaN(selectedProviderId)) {
        result = result.filter(article => article.prv === selectedProviderId);
        console.log('Debug - Artículos después del filtro:', result.length);
      }
    }

    result.sort((a, b) => {
      let comparison = 0;

      switch (sortColumn) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'ref':
          comparison = a.ref.localeCompare(b.ref);
          break;
        case 'sku_prv':
          comparison = a.sku_prv.localeCompare(b.sku_prv);
          break;
        case 'stk_con':
          comparison = a.stk_con - b.stk_con;
          break;
        case 'dep':
          comparison = a.dep - b.dep;
          break;
        case 'cos_net':
          comparison = a.cos_net - b.cos_net;
          break;
        case 'pre_net':
          const pvpA = a.pre_net * 1.21;
          const pvpB = b.pre_net * 1.21;
          comparison = pvpA - pvpB;
          break;
        case 'mar':
          comparison = a.mar - b.mar;
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredArticles(result);
  }, [articles, searchTerm, providerFilter, isAdmin, sortColumn, sortOrder]);

  if (loading) {
    return (
      <div className="articles-container">
        <div className="articles-header">
          <div className="articles-title">
            <h2>Artículos</h2>
            <p className="articles-subtitle">Cargando artículos...</p>
          </div>
        </div>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Cargando artículos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="articles-container">
        <div className="articles-header">
          <div className="articles-title">
            <h2>Artículos</h2>
            <p className="articles-subtitle text-red-600">{error}</p>
          </div>
        </div>
        <ConnectionErrorState />
      </div>
    );
  }

  return (
    <div className="articles-container">
      <div className="articles-header">
        <div className="articles-title">
          <h2>Artículos</h2>
          <p className="articles-subtitle">
            Listado de artículos disponibles (desde caché)
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="refresh-button"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      <div className="articles-controls">
        <div className="search-filter-container">
          <div className="search-container">
            <Search size={20} className="search-icon" />
            <input
              type="text"
              placeholder="Buscar por nombre, SKU o referencia..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="filter-button"
          >
            <Filter size={16} />
            Filtros
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="filters-panel">
          {isAdmin && (
            <div className="filter-group">
              <label className="filter-label">Proveedor:</label>
              <select
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value)}
                className="filter-select"
              >
                <option value="">Seleccionar proveedor...</option>
                {availableProviders.map((provider) => (
                  <option key={provider.id} value={provider.id.toString()}>
                    {provider.id} - {provider.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="filter-group">
          </div>
        </div>
      )}

      <div className="results-info">
        <p>
          Mostrando {filteredArticles.length} de {articles.length} artículos
          {isAdmin && (
            <span>
              {providerFilter ? (
                <span>
                  {' '}(Filtrando por: {getProviderName(parseInt(providerFilter))} | 
                  Datos de: Proveedor {currentProviderId})
                </span>
              ) : (
                <span> (Proveedor {currentProviderId})</span>
              )}
            </span>
          )}
        </p>
      </div>

      {filteredArticles.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <p className="text-gray-600">No hay artículos que coincidan con los criterios de búsqueda</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="articles-table">
            <thead className="table-header">
              <tr>
                <th className="table-header-cell">IMAGEN</th>
                <th 
                  onClick={() => handleSort('ref')}
                  className="table-header-cell sortable"
                >
                  SKU {getSortIndicator('ref')}
                </th>
                <th 
                  onClick={() => handleSort('sku_prv')}
                  className="table-header-cell sortable"
                >
                  SKU PROV. {getSortIndicator('sku_prv')}
                </th>
                <th 
                  onClick={() => handleSort('name')}
                  className="table-header-cell sortable"
                >
                  NOMBRE {getSortIndicator('name')}
                </th>
                <th 
                  onClick={() => handleSort('stk_con')}
                  className="table-header-cell sortable"
                >
                  STOCK COMPARTIDO {getSortIndicator('stk_con')}
                </th>
                <th 
                  onClick={() => handleSort('dep')}
                  className="table-header-cell sortable"
                >
                  DEPÓSITO {getSortIndicator('dep')}
                </th>
                <th className="table-header-cell">PTE. RECIBIR</th>
                <th className="table-header-cell">STOCK VENDIDO</th>
                <th
                  onClick={() => handleSort('cos_net')}
                  className="table-header-cell sortable"
                >
                  COSTO NETO {getSortIndicator('cos_net')}
                </th>
                <th
                  onClick={() => handleSort('pre_net')}
                  className="table-header-cell sortable"
                >
                  PVP {getSortIndicator('pre_net')}
                </th>
                <th
                  onClick={() => handleSort('mar')}
                  className="table-header-cell sortable"
                >
                  MARKUP {getSortIndicator('mar')}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredArticles.map((article) => (
                <ArticleRow
                  key={article.id}
                  article={article}
                  onImageClick={openImageModal}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showImageModal && selectedArticle && (
        <div className="modal-overlay" onClick={closeImageModal}>
          <div className="enhanced-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{selectedArticle.name}</h3>
              <button onClick={closeImageModal} className="modal-close">
                <X size={24} />
              </button>
            </div>
            <div className="enhanced-modal-body">
              {imageUrls.length > 0 ? (
                <div className="image-viewer">
                  <div className="main-image-container">
                    <ProductImage 
                      imageUrl={imageUrls[currentImageIndex]} 
                      articleName={selectedArticle.name} 
                    />
                  </div>
                  {imageUrls.length > 1 && (
                    <>
                      <div className="image-navigation">
                        <button
                          onClick={prevImage}
                          disabled={currentImageIndex === 0}
                          className="nav-button"
                        >
                          <ChevronLeft size={20} />
                        </button>
                        <span className="image-counter">
                          {currentImageIndex + 1} de {imageUrls.length}
                        </span>
                        <button
                          onClick={nextImage}
                          disabled={currentImageIndex === imageUrls.length - 1}
                          className="nav-button"
                        >
                          <ChevronRight size={20} />
                        </button>
                      </div>
                      <div className="thumbnail-container">
                        {imageUrls.map((url, index) => (
                          <div
                            key={index}
                            className={`thumbnail ${index === currentImageIndex ? 'active' : ''}`}
                            onClick={() => setCurrentImageIndex(index)}
                          >
                            <ProductImage imageUrl={url} articleName={selectedArticle.name} />
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="no-images-message">
                  <ImageIcon size={48} />
                  <p>No hay imágenes disponibles para este artículo</p>
                </div>
              )}
              
              <div className="product-details">
                <div className="detail-row">
                  <span className="detail-label">SKU</span>
                  <span className="detail-value">{selectedArticle.ref}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">SKU Proveedor</span>
                  <span className="detail-value">{selectedArticle.sku_prv}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Stock Compartido</span>
                  <span className="detail-value">{formatNumber(selectedArticle.stk_con)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Depósito</span>
                  <span className="detail-value">{formatNumber(selectedArticle.dep)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Costo Neto</span>
                  <span className="detail-value">{formatCurrency(selectedArticle.cos_net)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">PVP</span>
                  <span className="detail-value">{formatCurrency(selectedArticle.pre_net * 1.21)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Markup</span>
                  <span className="detail-value">{formatPercentage(selectedArticle.mar)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Articles;