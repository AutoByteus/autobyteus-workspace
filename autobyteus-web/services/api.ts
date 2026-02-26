import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import { getServerUrls } from '~/utils/serverConfig';

class ApiService {
  private readonly clientsByBaseUrl = new Map<string, AxiosInstance>();

  private resolveRestBaseUrl(): string {
    const contextStore = useWindowNodeContextStore();
    if (contextStore.initialized) {
      return contextStore.getBoundEndpoints().rest;
    }

    // In Electron runtime, this is a hard bootstrap ordering problem and must be explicit.
    if (typeof window !== 'undefined' && window.electronAPI) {
      throw new Error(
        'Window node context is not initialized yet. API call attempted before node bootstrap.',
      );
    }

    // Non-electron/dev fallback keeps browser-mode compatibility.
    return getServerUrls().rest;
  }

  private getOrCreateClient(baseURL: string): AxiosInstance {
    const existing = this.clientsByBaseUrl.get(baseURL);
    if (existing) {
      return existing;
    }

    const nextClient = axios.create({ baseURL });

    nextClient.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => config,
      (error) => Promise.reject(error),
    );

    nextClient.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error) => Promise.reject(error),
    );

    this.clientsByBaseUrl.set(baseURL, nextClient);
    return nextClient;
  }

  private requestClient(): AxiosInstance {
    const baseURL = this.resolveRestBaseUrl().replace(/\/+$/, '');
    return this.getOrCreateClient(baseURL);
  }

  public async get<T = unknown>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return this.requestClient().get<T>(url, config);
  }

  public async post<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return this.requestClient().post<T>(url, data, config);
  }

  public async put<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return this.requestClient().put<T>(url, data, config);
  }

  public async delete<T = unknown>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return this.requestClient().delete<T>(url, config);
  }
}

const apiService = new ApiService();
export default apiService;

