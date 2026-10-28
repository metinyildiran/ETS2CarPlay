# Third-party sources

Only source files needed by this project and their license notices are included. Unused examples, fonts and prebuilt binaries are excluded.

| Component | Source revision | License |
|---|---|---|
| Dear ImGui | ocornut/imgui, c1aaac65e896a45f81f47a4d68f9959e0f86c859 | vendor/imgui/LICENSE.txt |
| MinHook | TsudaKageyu/minhook, c3fcafdc10146beb5919319d0683e44e3c30d537 | vendor/minhook/LICENSE.txt |
| SCS SDK headers | See vendor/scs-sdk/readme.txt | vendor/scs-sdk/sdk_license.txt |
| ReShade headers (legacy add-on) | crosire/reshade v6.7.3 | vendor/reshade/LICENSE.md |

Electron is installed through desktop/package-lock.json; its runtime is not vendored. Extracted ETS2 game assets and the SCS extractor are not included.

The separately published Windows release ZIP includes the Electron runtime with its LICENSE and LICENSES.chromium.html, the native plugin license notices, and the generated dashboard mod. It excludes extracted source archives, development tools, local settings and pairing keys.
