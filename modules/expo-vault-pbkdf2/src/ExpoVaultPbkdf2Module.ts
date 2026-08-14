import { NativeModule, requireNativeModule } from "expo";

declare class ExpoVaultPbkdf2Module extends NativeModule<
  Record<string, never>
> {
  deriveVaultPbkdf2Sha256Async(
    password: string,
    saltHex: string,
  ): Promise<string>;
}

export default requireNativeModule<ExpoVaultPbkdf2Module>("ExpoVaultPbkdf2");
