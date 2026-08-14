package expo.modules.vaultpbkdf2

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.security.GeneralSecurityException
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.PBEKeySpec

private const val PBKDF2_ITERATIONS = 600_000
private const val DERIVED_KEY_BYTES = 32
private const val SALT_BYTES = 32

class ExpoVaultPbkdf2Module : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExpoVaultPbkdf2")

    AsyncFunction("deriveVaultPbkdf2Sha256Async") { password: String, saltHex: String ->
      val salt = decodeFixedHex(saltHex, SALT_BYTES)
      val passwordChars = password.toCharArray()
      val keySpec = PBEKeySpec(passwordChars, salt, PBKDF2_ITERATIONS, DERIVED_KEY_BYTES * 8)

      try {
        val derived = SecretKeyFactory
          .getInstance("PBKDF2WithHmacSHA256")
          .generateSecret(keySpec)
          .encoded
        encodeHex(derived)
      } catch (error: GeneralSecurityException) {
        throw IllegalStateException("Platform PBKDF2 is unavailable", error)
      } finally {
        keySpec.clearPassword()
        passwordChars.fill('\u0000')
        salt.fill(0)
      }
    }
  }

  private fun decodeFixedHex(value: String, expectedBytes: Int): ByteArray {
    if (value.length != expectedBytes * 2 || !value.matches(Regex("[0-9a-fA-F]+"))) {
      throw IllegalArgumentException("Invalid PBKDF2 salt")
    }

    return ByteArray(expectedBytes) { index ->
      value.substring(index * 2, index * 2 + 2).toInt(16).toByte()
    }
  }

  private fun encodeHex(bytes: ByteArray): String {
    return bytes.joinToString(separator = "") { byte -> "%02x".format(byte.toInt() and 0xFF) }
  }
}
