import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Alert, AppState, type AppStateStatus } from "react-native";
import {
  loadNagagoldConfigVersion,
  loadNagagoldRuntimeConfig,
  type NagagoldDynamicFeature,
  type NagagoldModule,
  type NagagoldRuntimeConfig,
  type NagagoldSystemParameter,
} from "./dataStore";

const CONFIG_VERSION_STORAGE_KEY = "@nagagold_config_version";
const CONFIG_POLL_INTERVAL_MS = 10_000;

function moduleConfigHash(value: { module_config_hash?: string; version?: string } | null | undefined): string {
  return value?.module_config_hash || value?.version || "";
}

type NagagoldConfigContextValue = {
  config: NagagoldRuntimeConfig | null;
  isLoading: boolean;
  errorMessage: string;
  activeStoreId?: string;
  reloadConfig: (storeId?: string) => Promise<NagagoldRuntimeConfig | null>;
  checkForChanges: () => Promise<void>;
  modules: NagagoldModule[];
  parameters: NagagoldSystemParameter[];
  dynamicFeatures: NagagoldDynamicFeature[];
  hasModule: (key: string) => boolean;
  getModule: (key: string) => NagagoldModule | undefined;
  getParameter: (key: string) => NagagoldSystemParameter | undefined;
  getFeaturesByGroup: (group: string) => NagagoldDynamicFeature[];
};

const NagagoldConfigContext = createContext<NagagoldConfigContextValue | null>(null);

export function NagagoldConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<NagagoldRuntimeConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const isReloadingRef = useRef(false);
  const isAlertVisibleRef = useRef(false);
  const latestVersionRef = useRef("");
  const activeStoreIdRef = useRef<string | undefined>(undefined);

  const reloadConfig = useCallback(async (storeId?: string) => {
    if (isReloadingRef.current) return null;
    isReloadingRef.current = true;
    setIsLoading(true);
    setErrorMessage("");
    try {
      activeStoreIdRef.current = storeId;
      const nextConfig = await loadNagagoldRuntimeConfig({ storeId });
      const nextHash = moduleConfigHash(nextConfig);
      setConfig(nextConfig);
      latestVersionRef.current = nextHash;
      if (nextHash) {
        await AsyncStorage.setItem(`${CONFIG_VERSION_STORAGE_KEY}:${storeId || "default"}`, nextHash);
      }
      return nextConfig;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Konfigurasi NAGAGOLD belum bisa dimuat.";
      setErrorMessage(message);
      return null;
    } finally {
      isReloadingRef.current = false;
      setIsLoading(false);
    }
  }, []);

  const promptReload = useCallback((nextVersion: string) => {
    if (isAlertVisibleRef.current) return;
    isAlertVisibleRef.current = true;
    Alert.alert(
      "Terdapat perubahan konfigurasi sistem.",
      "Tekan OK untuk memuat ulang module, parameter, dan form transaksi.",
      [
        {
          text: "OK",
          onPress: async () => {
            isAlertVisibleRef.current = false;
            latestVersionRef.current = nextVersion;
            await reloadConfig(activeStoreIdRef.current);
          },
        },
      ],
      { cancelable: false },
    );
  }, [reloadConfig]);

  const checkForChanges = useCallback(async () => {
    if (isReloadingRef.current || isAlertVisibleRef.current) return;
    try {
      const storeId = activeStoreIdRef.current;
      if (!storeId) return;
      const versionInfo = await loadNagagoldConfigVersion({ storeId });
      if (versionInfo.status && versionInfo.status !== "OK") {
        setErrorMessage(versionInfo.message ?? "");
        return;
      }
      const nextHash = moduleConfigHash(versionInfo);
      if (!nextHash) return;
      const versionKey = `${CONFIG_VERSION_STORAGE_KEY}:${storeId || "default"}`;
      const storedVersion = latestVersionRef.current || await AsyncStorage.getItem(versionKey);
      if (!storedVersion) {
        latestVersionRef.current = nextHash;
        await AsyncStorage.setItem(versionKey, nextHash);
        return;
      }
      if (nextHash !== storedVersion) {
        promptReload(nextHash);
      }
    } catch {
      // Silent by design. Screen-level loaders still surface connection errors where relevant.
    }
  }, [promptReload]);

  useEffect(() => {
    const interval = setInterval(checkForChanges, CONFIG_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [checkForChanges]);

  useEffect(() => {
    const handleAppState = (state: AppStateStatus) => {
      if (state === "active") {
        checkForChanges();
      }
    };
    const subscription = AppState.addEventListener("change", handleAppState);
    return () => subscription.remove();
  }, [checkForChanges]);

  const value = useMemo<NagagoldConfigContextValue>(() => {
    const modules = config?.modules ?? [];
    const parameters = config?.parameters ?? [];
    const dynamicFeatures = config?.dynamicFeatures ?? [];
    const modulesByKey = new Map(modules.map((module) => [module.key, module]));
    const parametersByKey = new Map(parameters.map((parameter) => [parameter.key, parameter]));

    return {
      config,
      isLoading,
      errorMessage,
      activeStoreId: activeStoreIdRef.current,
      reloadConfig,
      checkForChanges,
      modules,
      parameters,
      dynamicFeatures,
      hasModule: (key) => modulesByKey.has(key),
      getModule: (key) => modulesByKey.get(key),
      getParameter: (key) => parametersByKey.get(key),
      getFeaturesByGroup: (group) => dynamicFeatures.filter((feature) => feature.group === group && feature.enabled),
    };
  }, [checkForChanges, config, errorMessage, isLoading, reloadConfig]);

  return (
    <NagagoldConfigContext.Provider value={value}>
      {children}
    </NagagoldConfigContext.Provider>
  );
}

export function useNagagoldConfig() {
  const context = useContext(NagagoldConfigContext);
  if (!context) {
    throw new Error("useNagagoldConfig must be used inside NagagoldConfigProvider.");
  }
  return context;
}
