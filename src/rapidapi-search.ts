// RapidAPI Truecaller lookup — works without clientSecret or installationId!
import axios from "axios";

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || "d07fab1250mshc9767ae002ca827p1e76a6jsn32e608140359";
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || "truecaller-data2.p.rapidapi.com";

export interface RapidApiResult {
  data: {
    addressInfo: {
      address: string;
      street: string;
      zipCode: string;
      countryCode: string;
      city: string;
      timeZone: string;
    };
    badges: string[];
    basicInfo: {
      about: string;
      gender: string;
      image: string;
      jobTitle: string;
      name: {
        altName: string;
        fullName: string;
      };
    };
    internetInfo: {
      email?: {
        caption: string;
        id: string;
      };
    };
    phoneInfo: {
      e164Format: string;
      numberType: string;
      nationalFormat: string;
      dialingCode: number;
      countryCode: string;
      spamScore: number;
      spamType: string;
      carrier: string;
      type: string;
    };
    score: number;
    spamInfo: {
      spamScore: number;
      spamType: string;
    };
  };
  error: number;
}

/**
 * Search a phone number using the RapidAPI Truecaller endpoint.
 * No installationId or clientSecret needed!
 * 
 * @param phoneNumber - Phone number WITH country code, no "+" (e.g., "213792431470")
 * @returns Rich Truecaller data including name, carrier, location, email, spam info
 */
export async function rapidSearch(phoneNumber: string): Promise<RapidApiResult> {
  const clean = phoneNumber.replace(/[\s\-\+\(\)]/g, "");
  
  if (!/^\d{10,15}$/.test(clean)) {
    throw new Error(`Invalid phone number: "${phoneNumber}". Use format like "213792431470" (country code + number, no "+")`);
  }

  const url = `https://${RAPIDAPI_HOST}/search/${clean}`;
  
  const response = await axios.get<RapidApiResult>(url, {
    headers: {
      "x-rapidapi-key": RAPIDAPI_KEY,
      "x-rapidapi-host": RAPIDAPI_HOST,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });

  if (response.data.error !== 0) {
    throw new Error(`RapidAPI error code: ${response.data.error}`);
  }

  return response.data;
}

/**
 * Extract the caller name from a RapidAPI result.
 */
export function getCallerName(result: RapidApiResult): string {
  return result.data?.basicInfo?.name?.fullName || "Unknown";
}

/**
 * Extract the carrier from a RapidAPI result.
 */
export function getCarrier(result: RapidApiResult): string {
  return result.data?.phoneInfo?.carrier || "Unknown";
}

/**
 * Extract the email from a RapidAPI result.
 */
export function getEmail(result: RapidApiResult): string | null {
  return result.data?.internetInfo?.email?.id || null;
}

/**
 * Get a clean summary from a RapidAPI result.
 */
export function getSummary(result: RapidApiResult): {
  name: string;
  carrier: string;
  country: string;
  city: string;
  email: string | null;
  spamScore: number;
  badges: string[];
  gender: string;
  numberType: string;
  image: string;
} {
  const d = result.data;
  return {
    name: d.basicInfo?.name?.fullName || "Unknown",
    carrier: d.phoneInfo?.carrier || "Unknown",
    country: d.addressInfo?.countryCode || "Unknown",
    city: d.addressInfo?.city || "Unknown",
    email: d.internetInfo?.email?.id || null,
    spamScore: d.spamInfo?.spamScore || 0,
    badges: d.badges || [],
    gender: d.basicInfo?.gender || "",
    numberType: d.phoneInfo?.numberType || "",
    image: d.basicInfo?.image || "",
  };
}
