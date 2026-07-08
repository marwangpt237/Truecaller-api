// Apify-powered phone lookup — alternative to Truecaller when no installationId
import axios from "axios";

const APIFY_TOKEN = process.env.APIFY_API_TOKEN || "";
const APIFY_ACTOR = "khadinakbar~phone-number-lookup-api";

export interface ApifyPhoneResult {
  inputNumber: string;
  valid: boolean;
  e164: string;
  international: string;
  national: string;
  countryCode: string;
  countryName: string;
  lineType: string;
  isMobile: boolean;
  carrier: string | null;
  region: string | null;
  city: string | null;
  fraudScore: number | null;
  spammer: boolean | null;
  whatsApp: { registered: boolean; isBusiness: boolean } | null;
  telegram: { registered: boolean; publicName: string | null } | null;
  reverseLookupUrls: Record<string, string>;
  sources: string[];
}

/**
 * Look up a phone number using Apify (paid — $0.025/lookup).
 * Requires APIFY_API_TOKEN in environment.
 */
export async function apifyPhoneLookup(phoneNumber: string, countryCode?: string): Promise<ApifyPhoneResult> {
  if (!APIFY_TOKEN) {
    throw new Error("APIFY_API_TOKEN not set. Get one at https://console.apify.com/account/integrations");
  }

  // Start the run
  const startResp = await axios.post(
    `https://api.apify.com/v2/acts/${APIFY_ACTOR}/runs`,
    {
      phoneNumbers: [phoneNumber],
      includeCarrier: true,
      includeFraudScore: true,
      includeWhatsapp: true,
      includeTelegram: true,
      maxCostUsd: 0.05,
    },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${APIFY_TOKEN}`,
      },
    },
  );

  const datasetId = startResp.data.data.defaultDatasetId;
  if (!datasetId) throw new Error("No dataset ID returned from Apify");

  // Poll for results
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 1500));
    const itemsResp = await axios.get(
      `https://api.apify.com/v2/datasets/${datasetId}/items`,
      { headers: { Authorization: `Bearer ${APIFY_TOKEN}` } },
    );
    if (itemsResp.data.length > 0) {
      return itemsResp.data[0] as ApifyPhoneResult;
    }
  }

  throw new Error("Apify lookup timed out");
}
