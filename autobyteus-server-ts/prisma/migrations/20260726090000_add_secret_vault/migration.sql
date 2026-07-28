CREATE TABLE "secret_entries" (
    "secret_id" TEXT NOT NULL PRIMARY KEY,
    "nonce" BLOB NOT NULL CHECK (length("nonce") = 12),
    "ciphertext" BLOB NOT NULL,
    "authentication_tag" BLOB NOT NULL CHECK (length("authentication_tag") = 16)
);

CREATE TABLE "secret_encryption_metadata" (
    "singleton_id" INTEGER NOT NULL PRIMARY KEY CHECK ("singleton_id" = 1),
    "encryption_domain_id" BLOB NOT NULL CHECK (length("encryption_domain_id") = 16),
    "encryption_format_version" INTEGER NOT NULL CHECK ("encryption_format_version" > 0),
    "verifier_nonce" BLOB NOT NULL CHECK (length("verifier_nonce") = 12),
    "verifier_ciphertext" BLOB NOT NULL,
    "verifier_authentication_tag" BLOB NOT NULL CHECK (length("verifier_authentication_tag") = 16)
);

CREATE UNIQUE INDEX "secret_encryption_metadata_encryption_domain_id_key"
ON "secret_encryption_metadata"("encryption_domain_id");
