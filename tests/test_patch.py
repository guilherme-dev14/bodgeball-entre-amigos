import sys
from pathlib import Path
import subprocess
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from preparar_jogo import NORMALIZER, patch_transport


class TransportCompatibility(unittest.TestCase):
    def test_unknown_build_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "Build desconhecido"):
            patch_transport(b"another game build")

    def test_messages_keep_optional_fields_absent_and_binary_untouched(self):
        # Regressão: o receptor tratava null como índice de faixa de áudio.
        script = NORMALIZER + """
const assert = require('node:assert/strict');
const received = BBWebMessage({djTrack: undefined, enabled: false, count: 0});
assert.equal(Object.hasOwn(received, 'djTrack'), false);
assert.equal(received.enabled, false);
assert.equal(received.count, 0);
assert.equal(BBWebMessage({djTrack: 0}).djTrack, 0);
const movement = new Uint8Array([176, 3, 1, 0, 255]);
assert.equal(BBWebMessage(movement), movement);
const buffer = new ArrayBuffer(8);
assert.equal(BBWebMessage(buffer), buffer);
"""
        subprocess.run(["node", "-e", script], check=True)
