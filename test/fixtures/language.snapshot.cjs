/* eslint-disable */

exports[
  'language javascript writes the dependencies and module system into the manifest - should match snapshot - 0'
] = `{
  "name": "core",
  "private": true,
  "type": "module",
  "exports": {
    ".": {
      "types": "./index.d.ts",
      "default": "./index.js"
    }
  },
  "dependencies": {
    "bare-sidecar": "^0.5.12",
    "bare-stow-host": "^0.1.0"
  }
}
`

exports[
  'language python writes the dependencies and bundle into the manifest - should match snapshot - 0'
] = `[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "core"
version = "0.0.0"
requires-python = ">=3.10"
dependencies = [
  "bare-sidecar~=0.1.0",
  "bare-rpc~=0.1.0",
]

[tool.hatch.build.targets.wheel]
packages = ["core"]
artifacts = ["core/index.bundle", "core/index.bundle.d"]
`

exports[
  'language swift writes the dependencies and resources into the manifest - should match snapshot - 0'
] = `// swift-tools-version: 5.10
import PackageDescription

let package = Package(
  name: "Core",
  platforms: [.macOS(.v13)],
  products: [
    .library(name: "Core", targets: ["Core"])
  ],
  dependencies: [
    .package(url: "https://github.com/holepunchto/bare-sidecar-swift", .upToNextMinor(from: "0.1.0")),
  ],
  targets: [
    .target(
      name: "Core",
      dependencies: [
        .product(name: "BareSidecar", package: "bare-sidecar-swift"),
      ],
      resources: [.copy("index.bundle"), .copy("index.bundle.d")]
    )
  ]
)
`

exports['language kotlin writes the dependencies into the manifest - should match snapshot - 0'] =
  `plugins {
  id "com.android.library"
}

if (findProperty("android.builtInKotlin") == "false") {
  apply plugin: "org.jetbrains.kotlin.android"
}

android {
  namespace = "com.example.core"
  compileSdk = 36

  defaultConfig {
    minSdk = 29
  }
}

dependencies {
  api "com.github.holepunchto.bare-kit-kotlin:bare-kit-kotlin:v0.1.0"
}
`

exports['language swift declares linked addons as binary targets - should match snapshot - 0'] =
  `// swift-tools-version: 5.10
import PackageDescription

let package = Package(
  name: "Core",
  platforms: [.iOS(.v15)],
  products: [
    .library(name: "Core", targets: ["Core"])
  ],
  dependencies: [

  ],
  targets: [
    .target(
      name: "Core",
      dependencies: [
        "addon.1.2.3",
      ],
      resources: [.copy("index.bundle")]
    ),
    .binaryTarget(name: "addon.1.2.3", path: "Frameworks/addon.1.2.3.xcframework")
  ]
)
`

exports['language kotlin declares linked addons and their classes - should match snapshot - 0'] =
  `plugins {
  id "com.android.library"
}

if (findProperty("android.builtInKotlin") == "false") {
  apply plugin: "org.jetbrains.kotlin.android"
}

android {
  namespace = "com.example.core"
  compileSdk = 36

  defaultConfig {
    minSdk = 29
  }

  sourceSets {
    main {
      jniLibs.directories.add("src/main/addons")
    }
  }
}

dependencies {
  api files("src/main/addons/addon.classes.jar")
}
`

/* eslint-enable */
