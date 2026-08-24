import { z } from "zod";
export declare const tokenUsageUnitPriceSummaryDtoSchema: z.ZodObject<{
    status: z.ZodEnum<{
        single: "single";
        mixed: "mixed";
        missing: "missing";
        partial_missing: "partial_missing";
        not_applicable: "not_applicable";
        local_no_api_bill: "local_no_api_bill";
    }>;
    price_per_million: z.ZodNullable<z.ZodNumber>;
}, z.core.$strict>;
export declare const tokenUsageUnitPricesDtoSchema: z.ZodObject<{
    standard_input: z.ZodObject<{
        status: z.ZodEnum<{
            single: "single";
            mixed: "mixed";
            missing: "missing";
            partial_missing: "partial_missing";
            not_applicable: "not_applicable";
            local_no_api_bill: "local_no_api_bill";
        }>;
        price_per_million: z.ZodNullable<z.ZodNumber>;
    }, z.core.$strict>;
    cache_read_input: z.ZodObject<{
        status: z.ZodEnum<{
            single: "single";
            mixed: "mixed";
            missing: "missing";
            partial_missing: "partial_missing";
            not_applicable: "not_applicable";
            local_no_api_bill: "local_no_api_bill";
        }>;
        price_per_million: z.ZodNullable<z.ZodNumber>;
    }, z.core.$strict>;
    cache_creation_input: z.ZodObject<{
        status: z.ZodEnum<{
            single: "single";
            mixed: "mixed";
            missing: "missing";
            partial_missing: "partial_missing";
            not_applicable: "not_applicable";
            local_no_api_bill: "local_no_api_bill";
        }>;
        price_per_million: z.ZodNullable<z.ZodNumber>;
    }, z.core.$strict>;
    cache_creation_5m_input: z.ZodObject<{
        status: z.ZodEnum<{
            single: "single";
            mixed: "mixed";
            missing: "missing";
            partial_missing: "partial_missing";
            not_applicable: "not_applicable";
            local_no_api_bill: "local_no_api_bill";
        }>;
        price_per_million: z.ZodNullable<z.ZodNumber>;
    }, z.core.$strict>;
    cache_creation_1h_input: z.ZodObject<{
        status: z.ZodEnum<{
            single: "single";
            mixed: "mixed";
            missing: "missing";
            partial_missing: "partial_missing";
            not_applicable: "not_applicable";
            local_no_api_bill: "local_no_api_bill";
        }>;
        price_per_million: z.ZodNullable<z.ZodNumber>;
    }, z.core.$strict>;
    output: z.ZodObject<{
        status: z.ZodEnum<{
            single: "single";
            mixed: "mixed";
            missing: "missing";
            partial_missing: "partial_missing";
            not_applicable: "not_applicable";
            local_no_api_bill: "local_no_api_bill";
        }>;
        price_per_million: z.ZodNullable<z.ZodNumber>;
    }, z.core.$strict>;
    reasoning_output: z.ZodObject<{
        status: z.ZodEnum<{
            single: "single";
            mixed: "mixed";
            missing: "missing";
            partial_missing: "partial_missing";
            not_applicable: "not_applicable";
            local_no_api_bill: "local_no_api_bill";
        }>;
        price_per_million: z.ZodNullable<z.ZodNumber>;
    }, z.core.$strict>;
}, z.core.$strict>;
export declare const tokenUsageRunSummaryDtoSchema: z.ZodObject<{
    run_id: z.ZodString;
    root_team_run_id: z.ZodNullable<z.ZodString>;
    agent_definition_id: z.ZodNullable<z.ZodString>;
    workspace_id: z.ZodNullable<z.ZodString>;
    gross_input_tokens: z.ZodNumber;
    standard_input_tokens: z.ZodNumber;
    cache_miss_input_tokens: z.ZodNumber;
    cache_read_input_tokens: z.ZodNumber;
    cache_creation_input_tokens: z.ZodNumber;
    cache_creation_5m_input_tokens: z.ZodNumber;
    cache_creation_1h_input_tokens: z.ZodNumber;
    output_tokens: z.ZodNumber;
    reasoning_output_tokens: z.ZodNumber;
    billable_output_tokens: z.ZodNumber;
    total_tokens: z.ZodNumber;
    cache_read_input_token_rate: z.ZodNullable<z.ZodNumber>;
    standard_input_token_rate: z.ZodNullable<z.ZodNumber>;
    cache_creation_input_token_rate: z.ZodNullable<z.ZodNumber>;
    cache_state: z.ZodEnum<{
        unknown: "unknown";
        positive: "positive";
        zero_reported: "zero_reported";
        not_reported: "not_reported";
        unsupported_or_local: "unsupported_or_local";
    }>;
    estimated_api_input_cost: z.ZodNullable<z.ZodNumber>;
    estimated_api_standard_input_cost: z.ZodNullable<z.ZodNumber>;
    estimated_api_cache_read_input_cost: z.ZodNullable<z.ZodNumber>;
    estimated_api_cache_creation_input_cost: z.ZodNullable<z.ZodNumber>;
    estimated_api_cache_creation_5m_input_cost: z.ZodNullable<z.ZodNumber>;
    estimated_api_cache_creation_1h_input_cost: z.ZodNullable<z.ZodNumber>;
    estimated_api_output_cost: z.ZodNullable<z.ZodNumber>;
    estimated_api_reasoning_output_cost: z.ZodNullable<z.ZodNumber>;
    estimated_api_total_cost: z.ZodNullable<z.ZodNumber>;
    currency: z.ZodNullable<z.ZodString>;
    api_cost_status: z.ZodEnum<{
        mixed: "mixed";
        local_no_api_bill: "local_no_api_bill";
        estimated: "estimated";
        price_missing: "price_missing";
        partial_price_missing: "partial_price_missing";
    }>;
    missing_price_dimensions: z.ZodArray<z.ZodString>;
    pricing_policy_key: z.ZodNullable<z.ZodString>;
    selected_pricing_tier_id: z.ZodNullable<z.ZodString>;
    unit_prices: z.ZodObject<{
        standard_input: z.ZodObject<{
            status: z.ZodEnum<{
                single: "single";
                mixed: "mixed";
                missing: "missing";
                partial_missing: "partial_missing";
                not_applicable: "not_applicable";
                local_no_api_bill: "local_no_api_bill";
            }>;
            price_per_million: z.ZodNullable<z.ZodNumber>;
        }, z.core.$strict>;
        cache_read_input: z.ZodObject<{
            status: z.ZodEnum<{
                single: "single";
                mixed: "mixed";
                missing: "missing";
                partial_missing: "partial_missing";
                not_applicable: "not_applicable";
                local_no_api_bill: "local_no_api_bill";
            }>;
            price_per_million: z.ZodNullable<z.ZodNumber>;
        }, z.core.$strict>;
        cache_creation_input: z.ZodObject<{
            status: z.ZodEnum<{
                single: "single";
                mixed: "mixed";
                missing: "missing";
                partial_missing: "partial_missing";
                not_applicable: "not_applicable";
                local_no_api_bill: "local_no_api_bill";
            }>;
            price_per_million: z.ZodNullable<z.ZodNumber>;
        }, z.core.$strict>;
        cache_creation_5m_input: z.ZodObject<{
            status: z.ZodEnum<{
                single: "single";
                mixed: "mixed";
                missing: "missing";
                partial_missing: "partial_missing";
                not_applicable: "not_applicable";
                local_no_api_bill: "local_no_api_bill";
            }>;
            price_per_million: z.ZodNullable<z.ZodNumber>;
        }, z.core.$strict>;
        cache_creation_1h_input: z.ZodObject<{
            status: z.ZodEnum<{
                single: "single";
                mixed: "mixed";
                missing: "missing";
                partial_missing: "partial_missing";
                not_applicable: "not_applicable";
                local_no_api_bill: "local_no_api_bill";
            }>;
            price_per_million: z.ZodNullable<z.ZodNumber>;
        }, z.core.$strict>;
        output: z.ZodObject<{
            status: z.ZodEnum<{
                single: "single";
                mixed: "mixed";
                missing: "missing";
                partial_missing: "partial_missing";
                not_applicable: "not_applicable";
                local_no_api_bill: "local_no_api_bill";
            }>;
            price_per_million: z.ZodNullable<z.ZodNumber>;
        }, z.core.$strict>;
        reasoning_output: z.ZodObject<{
            status: z.ZodEnum<{
                single: "single";
                mixed: "mixed";
                missing: "missing";
                partial_missing: "partial_missing";
                not_applicable: "not_applicable";
                local_no_api_bill: "local_no_api_bill";
            }>;
            price_per_million: z.ZodNullable<z.ZodNumber>;
        }, z.core.$strict>;
    }, z.core.$strict>;
    latest_prompt_tokens: z.ZodNullable<z.ZodNumber>;
    effective_context_window_tokens: z.ZodNullable<z.ZodNumber>;
    context_window_usage_percent: z.ZodNullable<z.ZodNumber>;
    latest_model_provider: z.ZodNullable<z.ZodString>;
    latest_model_identifier: z.ZodNullable<z.ZodString>;
    latest_runtime_kind: z.ZodNullable<z.ZodString>;
    usage_report_count: z.ZodNumber;
    updated_at: z.ZodNullable<z.ZodString>;
}, z.core.$strict>;
export type TokenUsageUnitPriceSummaryDto = Readonly<z.infer<typeof tokenUsageUnitPriceSummaryDtoSchema>>;
export type TokenUsageUnitPricesDto = Readonly<z.infer<typeof tokenUsageUnitPricesDtoSchema>>;
export type TokenUsageRunSummaryDto = Readonly<z.infer<typeof tokenUsageRunSummaryDtoSchema>>;
//# sourceMappingURL=token-usage-run-summary-dto.d.ts.map