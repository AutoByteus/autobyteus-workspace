#!/usr/bin/env bash
set -euo pipefail
required=(
  IOS_DISTRIBUTION_CERTIFICATE_P12_BASE64
  IOS_DISTRIBUTION_CERTIFICATE_P12_PASSWORD
  IOS_APPSTORE_PROVISIONING_PROFILE_BASE64
  IOS_DEVELOPMENT_TEAM
  APP_STORE_CONNECT_KEY_ID
  APP_STORE_CONNECT_ISSUER_ID
  APP_STORE_CONNECT_API_KEY_P8_BASE64
)
if [[ -d autobyteus-ios/AutoByteusMobileShareExtension ]]; then
  required+=(IOS_SHARE_EXTENSION_APPSTORE_PROVISIONING_PROFILE_BASE64)
fi
missing=()
for name in "${required[@]}"; do
  if [[ -z "${!name:-}" ]]; then
    missing+=("$name")
  fi
done
if (( ${#missing[@]} > 0 )); then
  echo "::error::iOS App Store Connect/TestFlight publish was requested, but required iOS secrets are missing: ${missing[*]}"
  echo "Configure the missing repository secrets before publishing:"
  for name in "${missing[@]}"; do
    echo "  gh secret set $name"
  done
  echo "Existing desktop APPLE_* secrets and Developer ID Application certificates are not valid iOS App Store signing inputs."
  exit 1
fi
echo "All required iOS/App Store Connect secret names are present. Values were not printed."
