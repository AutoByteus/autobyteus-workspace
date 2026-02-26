/**
 * LLM Configuration classes.
 */

export interface TokenPricingConfigData {
  input_token_pricing?: number;
  output_token_pricing?: number;
}

export interface TokenPricingConfigInput {
  inputTokenPricing?: number;
  outputTokenPricing?: number;
}

export class TokenPricingConfig {
  public inputTokenPricing: number;
  public outputTokenPricing: number;

  constructor(data: TokenPricingConfigInput = {}) {
    this.inputTokenPricing = data.inputTokenPricing ?? 0.0;
    this.outputTokenPricing = data.outputTokenPricing ?? 0.0;
  }

  static fromDict(data: Record<string, unknown>): TokenPricingConfig {
    return new TokenPricingConfig({
      inputTokenPricing: (data as { input_token_pricing?: number }).input_token_pricing ?? 0.0,
      outputTokenPricing: (data as { output_token_pricing?: number }).output_token_pricing ?? 0.0
    });
  }

  toDict(): TokenPricingConfigData {
    return {
      input_token_pricing: this.inputTokenPricing,
      output_token_pricing: this.outputTokenPricing
    };
  }

  mergeWith(override: TokenPricingConfig | null | undefined): void {
    if (!override) return;
    // Match Python behavior: any override value (including 0.0) replaces current.
    this.inputTokenPricing = override.inputTokenPricing;
    this.outputTokenPricing = override.outputTokenPricing;
  }
}

export interface LLMConfigData {
  rate_limit?: number | null;
  token_limit?: number | null;
  system_message?: string;
  temperature?: number;
  max_tokens?: number | null;
  compaction_ratio?: number | null;
  safety_margin_tokens?: number | null;
  top_p?: number | null;
  frequency_penalty?: number | null;
  presence_penalty?: number | null;
  stop_sequences?: string[] | null;
  extra_params?: Record<string, unknown>;
  pricing_config?: TokenPricingConfig | TokenPricingConfigData;
}

export interface LLMConfigInput {
  rateLimit?: number | null;
  tokenLimit?: number | null;
  systemMessage?: string;
  temperature?: number;
  maxTokens?: number | null;
  compactionRatio?: number | null;
  safetyMarginTokens?: number | null;
  topP?: number | null;
  frequencyPenalty?: number | null;
  presencePenalty?: number | null;
  stopSequences?: string[] | null;
  extraParams?: Record<string, unknown>;
  pricingConfig?: TokenPricingConfig | TokenPricingConfigInput;
}

export class LLMConfig {
  public rateLimit: number | null;
  public tokenLimit: number | null;
  public systemMessage: string;
  public temperature: number;
  public maxTokens: number | null;
  public compactionRatio: number | null;
  public safetyMarginTokens: number | null;
  public topP: number | null;
  public frequencyPenalty: number | null;
  public presencePenalty: number | null;
  public stopSequences: string[] | null;
  public extraParams: Record<string, unknown>;
  public pricingConfig: TokenPricingConfig;

  constructor(data: LLMConfigInput = {}) {
    this.rateLimit = data.rateLimit ?? null;
    this.tokenLimit = data.tokenLimit ?? null;
    this.systemMessage = data.systemMessage ?? 'You are a helpful assistant.';
    this.temperature = data.temperature ?? 0.7;
    this.maxTokens = data.maxTokens ?? null;
    this.compactionRatio = data.compactionRatio ?? null;
    this.safetyMarginTokens = data.safetyMarginTokens ?? null;
    this.topP = data.topP ?? null;
    this.frequencyPenalty = data.frequencyPenalty ?? null;
    this.presencePenalty = data.presencePenalty ?? null;
    this.stopSequences = data.stopSequences ?? null;
    this.extraParams = data.extraParams ?? {};

    if (data.pricingConfig instanceof TokenPricingConfig) {
      this.pricingConfig = data.pricingConfig;
    } else if (data.pricingConfig && typeof data.pricingConfig === 'object') {
      const configData = data.pricingConfig as TokenPricingConfigInput;
      this.pricingConfig = new TokenPricingConfig(configData);
    } else if (data.pricingConfig === undefined || data.pricingConfig === null) {
      this.pricingConfig = new TokenPricingConfig();
    } else {
      this.pricingConfig = new TokenPricingConfig();
    }
  }

  static defaultConfig(): LLMConfig {
    return new LLMConfig();
  }

  static fromDict(data: Record<string, unknown>): LLMConfig {
    const pricingData = (data as { pricing_config?: TokenPricingConfigData }).pricing_config ?? {};

    const configData: LLMConfigInput = {
      rateLimit: (data as { rate_limit?: number | null }).rate_limit ?? null,
      tokenLimit: (data as { token_limit?: number | null }).token_limit ?? null,
      systemMessage: (data as { system_message?: string }).system_message ?? undefined,
      temperature: (data as { temperature?: number }).temperature ?? undefined,
      maxTokens: (data as { max_tokens?: number | null }).max_tokens ?? null,
      compactionRatio: (data as { compaction_ratio?: number | null }).compaction_ratio ?? null,
      safetyMarginTokens: (data as { safety_margin_tokens?: number | null }).safety_margin_tokens ?? null,
      topP: (data as { top_p?: number | null }).top_p ?? null,
      frequencyPenalty: (data as { frequency_penalty?: number | null }).frequency_penalty ?? null,
      presencePenalty: (data as { presence_penalty?: number | null }).presence_penalty ?? null,
      stopSequences: (data as { stop_sequences?: string[] | null }).stop_sequences ?? null,
      extraParams: (data as { extra_params?: Record<string, unknown> }).extra_params ?? {},
      pricingConfig: new TokenPricingConfig({
        inputTokenPricing: pricingData.input_token_pricing,
        outputTokenPricing: pricingData.output_token_pricing
      })
    };

    return new LLMConfig(configData);
  }

  toDict(): LLMConfigData {
    const data: LLMConfigData = {
      rate_limit: this.rateLimit,
      token_limit: this.tokenLimit,
      system_message: this.systemMessage,
      temperature: this.temperature,
      max_tokens: this.maxTokens,
      compaction_ratio: this.compactionRatio,
      safety_margin_tokens: this.safetyMarginTokens,
      top_p: this.topP,
      frequency_penalty: this.frequencyPenalty,
      presence_penalty: this.presencePenalty,
      stop_sequences: this.stopSequences,
      extra_params: this.extraParams,
      pricing_config: this.pricingConfig instanceof TokenPricingConfig
        ? this.pricingConfig.toDict()
        : {}
    };
    
    // Filter None/null values? Python implementation does:
    // return {k: v for k, v in data.items() if v is not None}
    
    const filtered: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== null && value !== undefined) {
        filtered[key] = value;
      }
    }
    return filtered as LLMConfigData;
  }

  toJson(): string {
    return JSON.stringify(this.toDict());
  }

  static fromJson(jsonStr: string): LLMConfig {
    const data = JSON.parse(jsonStr);
    return LLMConfig.fromDict(data);
  }

  update(updates: Record<string, unknown>): void {
    for (const [key, value] of Object.entries(updates)) {
      if (key === 'pricingConfig' && value && typeof value === 'object') {
        const nextConfig =
          value instanceof TokenPricingConfig
            ? value
            : new TokenPricingConfig(value as TokenPricingConfigInput);
        if (this.pricingConfig instanceof TokenPricingConfig) {
          this.pricingConfig.mergeWith(nextConfig);
        } else {
          this.pricingConfig = nextConfig;
        }
        continue;
      }

      if (key in this) {
        (this as Record<string, unknown>)[key] = value;
      } else {
        this.extraParams[key] = value;
      }
    }

    if (this.pricingConfig && !(this.pricingConfig instanceof TokenPricingConfig)) {
      if (typeof this.pricingConfig === 'object') {
        this.pricingConfig = new TokenPricingConfig(this.pricingConfig as TokenPricingConfigInput);
      } else {
        this.pricingConfig = new TokenPricingConfig();
      }
    }
  }

  mergeWith(override: LLMConfig | null | undefined): void {
    if (!override) return;
    
    if (override.rateLimit !== null && override.rateLimit !== undefined) this.rateLimit = override.rateLimit;
    if (override.tokenLimit !== null && override.tokenLimit !== undefined) this.tokenLimit = override.tokenLimit;
    if (override.systemMessage !== null && override.systemMessage !== undefined) this.systemMessage = override.systemMessage;
    if (override.temperature !== null && override.temperature !== undefined) this.temperature = override.temperature;
    if (override.maxTokens !== null && override.maxTokens !== undefined) this.maxTokens = override.maxTokens;
    if (override.compactionRatio !== null && override.compactionRatio !== undefined) {
      this.compactionRatio = override.compactionRatio;
    }
    if (override.safetyMarginTokens !== null && override.safetyMarginTokens !== undefined) {
      this.safetyMarginTokens = override.safetyMarginTokens;
    }
    if (override.topP !== null && override.topP !== undefined) this.topP = override.topP;
    if (override.frequencyPenalty !== null && override.frequencyPenalty !== undefined) {
      this.frequencyPenalty = override.frequencyPenalty;
    }
    if (override.presencePenalty !== null && override.presencePenalty !== undefined) {
      this.presencePenalty = override.presencePenalty;
    }
    if (override.stopSequences !== null && override.stopSequences !== undefined) {
      this.stopSequences = override.stopSequences;
    }

    if (override.extraParams && typeof override.extraParams === 'object') {
      this.extraParams = { ...this.extraParams, ...override.extraParams };
    }

    if (!(this.pricingConfig instanceof TokenPricingConfig)) {
      this.pricingConfig = new TokenPricingConfig();
    }
    if (override.pricingConfig instanceof TokenPricingConfig) {
      this.pricingConfig.mergeWith(override.pricingConfig);
    } else if (override.pricingConfig && typeof override.pricingConfig === 'object') {
      this.pricingConfig.mergeWith(new TokenPricingConfig(override.pricingConfig as TokenPricingConfigInput));
    }
  }

  clone(): LLMConfig {
    return LLMConfig.fromDict(this.toDict() as Record<string, unknown>);
  }
}
