// Modelo de parâmetros do ViralFlow baseado na tabela de argumentos da documentação.

export interface ViralflowParams {
  virus: 'sars-cov2' | 'custom';
  primersBED: string;        // caminho absoluto (ou vazio)
  outDir: string;            // caminho para diretório de saída
  inDir: string;             // caminho para diretório de entrada
  runSnpEff: boolean;
  writeMappedReads: boolean;
  minLen: number;
  depth: number;
  mapping_quality: number;
  base_quality: number;
  minDpIntrahost: number;
  trimLen: number;
  refGenomeCode: string;
  referenceGFF: string;
  referenceGenome: string;
  nextflowSimCalls: string;  // pode ser vazio ou número em string
  fastp_threads: number;
  bwa_threads: number;
  dedup: boolean;
  ndedup: number;
}
