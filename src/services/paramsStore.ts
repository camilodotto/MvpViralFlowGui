import type { ViralflowParams } from '../types/params';

// Camada fina sobre window.api para facilitar testes / futuras mudanças.
export async function loadParams(): Promise<ViralflowParams> {
  const params = await window.api.getParams();
  return params;
}

export async function saveParams(params: ViralflowParams): Promise<ViralflowParams> {
  return window.api.saveParams(params);
}
