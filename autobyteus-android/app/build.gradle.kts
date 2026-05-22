import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val androidVersionName = System.getenv("ANDROID_VERSION_NAME")
    ?.takeIf { it.isNotBlank() }
    ?: "0.1.0"

val androidVersionCode = System.getenv("ANDROID_VERSION_CODE")
    ?.takeIf { it.isNotBlank() }
    ?.let { rawVersionCode ->
        val parsedVersionCode = rawVersionCode.toIntOrNull()
        if (parsedVersionCode == null || parsedVersionCode !in 1..2_100_000_000) {
            throw GradleException(
                "ANDROID_VERSION_CODE must be an integer from 1 to 2100000000; received '$rawVersionCode'.",
            )
        }
        parsedVersionCode
    }
    ?: 1

val ciKeystorePath = System.getenv("ANDROID_KEYSTORE_PATH")?.takeIf { it.isNotBlank() }
val ciKeystorePassword = System.getenv("ANDROID_KEYSTORE_PASSWORD")?.takeIf { it.isNotBlank() }
val ciKeyAlias = System.getenv("ANDROID_KEY_ALIAS")?.takeIf { it.isNotBlank() }
val ciKeyPassword = System.getenv("ANDROID_KEY_PASSWORD")?.takeIf { it.isNotBlank() }
val ciSigningValues = listOf(ciKeystorePath, ciKeystorePassword, ciKeyAlias, ciKeyPassword)
val ciReleaseSigningEnabled = ciSigningValues.all { it != null }

if (ciSigningValues.any { it != null } && !ciReleaseSigningEnabled) {
    throw GradleException(
        "Android release signing is incomplete. Set ANDROID_KEYSTORE_PATH, ANDROID_KEYSTORE_PASSWORD, " +
            "ANDROID_KEY_ALIAS, and ANDROID_KEY_PASSWORD together.",
    )
}

android {
    namespace = "org.autobyteus.mobile"
    compileSdk = 35

    defaultConfig {
        applicationId = "org.autobyteus.mobile"
        minSdk = 26
        targetSdk = 35
        versionCode = androidVersionCode
        versionName = androidVersionName
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    signingConfigs {
        if (ciReleaseSigningEnabled) {
            create("ciRelease") {
                storeFile = file(ciKeystorePath!!)
                storePassword = ciKeystorePassword
                keyAlias = ciKeyAlias
                keyPassword = ciKeyPassword
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
            if (ciReleaseSigningEnabled) {
                signingConfig = signingConfigs.getByName("ciRelease")
            }
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

}

kotlin {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_17)
    }
}

dependencies {
    implementation("androidx.core:core:1.13.1")
    implementation("com.journeyapps:zxing-android-embedded:4.3.0")

    testImplementation("junit:junit:4.13.2")

    androidTestImplementation("androidx.test:runner:1.6.1")
    androidTestImplementation("androidx.test:core:1.6.1")
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
}
