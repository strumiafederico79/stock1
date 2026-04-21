from io import BytesIO

import barcode
import qrcode
from barcode.writer import ImageWriter


def generate_code128_png(value: str) -> bytes:
    buffer = BytesIO()
    barcode_class = barcode.get_barcode_class('code128')
    code = barcode_class(value, writer=ImageWriter())
    code.write(buffer, options={'module_height': 12.0, 'module_width': 0.3, 'font_size': 10, 'quiet_zone': 2.0})
    return buffer.getvalue()


def generate_qr_png(value: str) -> bytes:
    image = qrcode.make(value)
    buffer = BytesIO()
    image.save(buffer, format='PNG')
    return buffer.getvalue()
