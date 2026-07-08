// Truecaller-API — Main entry point
// MIT License — Based on original truecallerjs by Sumith Emmadi

import { login as loginFunction } from "./login.js";
import { verifyOtp as verifyOtpFunction } from "./verifyOtp.js";
import {
  search as searchFunction,
  bulkSearch as bulkSearchFunction,
} from "./search.js";
import {
  rapidSearch as rapidSearchFn,
  getCallerName as getCallerNameFn,
  getCarrier as getCarrierFn,
  getEmail as getEmailFn,
  getSummary as getSummaryFn,
} from "./rapidapi-search.js";
import { apifyPhoneLookup as apifyPhoneLookupFn } from "./apify-search.js";

export const rapidSearch = rapidSearchFn;
export const getCallerName = getCallerNameFn;
export const getCarrier = getCarrierFn;
export const getEmail = getEmailFn;
export const getSummary = getSummaryFn;
export const apifyPhoneLookup = apifyPhoneLookupFn;

export const login = loginFunction;
export const verifyOtp = verifyOtpFunction;
export const search = searchFunction;
export const bulkSearch = bulkSearchFunction;

const truecallerApi = {
  login,
  verifyOtp,
  search,
  bulkSearch,
  rapidSearch,
  apifyPhoneLookup,
  getCallerName,
  getCarrier,
  getEmail,
  getSummary,
};

export default truecallerApi;
