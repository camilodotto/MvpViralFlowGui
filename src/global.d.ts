import type { ViralflowParams } from './types/params';

export {};

declare global {
  interface Window {
    api: {
      getGuiVersion: () => Promise<string>;
      getConfig: () => Promise<{ repoPath: string | null; locale?: string }>;
      setRepoPath: (path: string | null) => Promise<{ repoPath: string | null; locale?: string }>;
      setLocale: (locale: string) => Promise<{ repoPath: string | null; locale: string }>;
      getParams: () => Promise<ViralflowParams>;
      saveParams: (params: ViralflowParams) => Promise<ViralflowParams>;
      saveParamsToFile: (
        params: ViralflowParams
      ) => Promise<{ ok: boolean; path?: string; canceled?: boolean; error?: string }>;
      loadParamsFromFile: () => Promise<{
        ok: boolean;
        params?: ViralflowParams;
        path?: string;
        canceled?: boolean;
        error?: string;
      }>;
      selectDirectory: (defaultPath?: string) => Promise<string | null>;
      selectFile: (defaultPath?: string) => Promise<string | null>;
      listDir: (
        directory: string
      ) => Promise<{ name: string; path: string; isDirectory: boolean }[]>;
      getHomeDir: () => Promise<string | null>;
      getFileUrl: (filePath: string) => Promise<string | null>;
      resolveOutDir: (outDir: string) => Promise<string | null>;
      cloneDefaultRepo: () => Promise<{ ok: boolean; alreadyExists?: boolean; path: string }>;
      gitPullRepo: () => Promise<{ ok: boolean; log?: string }>;
      getViralflowVersion: () => Promise<string | null>;
      viralflowRun: (
        params: ViralflowParams
      ) => Promise<{
        ok: boolean;
        cmd: string;
        stdout: string;
        stderr: string;
        error?: string;
      }>;


      checkInstallStatus: () => Promise<{
        micromambaInstalled: boolean;
        micromambaVersion: string | null;
        viralflowInstalled: boolean;
        viralflowVersion: string | null;
        containersBuilt: boolean;
      }>;

      installMicromamba: () => Promise<{
        ok: boolean;
        micromambaInstalled: boolean;
        micromambaVersion: string | null;
      }>;

      installViralflow: () => Promise<{
        ok: boolean;
        micromambaInstalled: boolean;
        micromambaVersion: string | null;
        viralflowInstalled: boolean;
        viralflowVersion: string | null;
        containersBuilt: boolean;
        error?: string;
      }>;

      buildContainers: () => Promise<{
        ok: boolean;
        containersBuilt: boolean;
        error?: string;
      }>;

      updatePangolin: (
        mode: 'toolAndData' | 'dataOnly'
      ) => Promise<{
        ok: boolean;
        error?: string;
      }>;

      addSnpeffEntry: (
        payload: { orgName: string; genomeCode: string }
      ) => Promise<{
        ok: boolean;
        error?: string;
      }>;

      onSetupLog: (
        callback: (payload: { kind: 'stdout' | 'stderr'; text: string }) => void
      ) => () => void;

      onViralflowLog: (
        callback: (payload: { kind: 'stdout' | 'stderr'; text: string }) => void
      ) => () => void;

    };
  }
}