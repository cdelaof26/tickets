from flask import Flask, request, jsonify, send_file, abort, render_template
from zipfile import ZipFile, ZIP_DEFLATED
from flask_cors import CORS
from datetime import date
from pathlib import Path
import pymupdf
import re
import io


font_name = "ArialNarrow"
font_file = "static/Arial Narrow Bold.ttf"
base_path = Path("sold")
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*", "expose_headers": ["Content-Disposition"]}})


def _gen_single_ticket(template_name: str, num: int, _date: str, output_name: str) -> Path:
    template = pymupdf.open(Path(f"static/{template_name}.pdf"))

    page = template[0]
    page.insert_font(fontfile=font_file, fontname=font_name)
    page.insert_text(pymupdf.Point(315, 307), f"{num}", fontname="ArialNarrow", fontsize=64)
    page.insert_text(pymupdf.Point(390, 346), f"{_date}", fontname="ArialNarrow", fontsize=20)

    base_path.mkdir(exist_ok=True)
    output = base_path.joinpath(f"{output_name}.pdf")
    template.save(output)
    template.close()
    return output


def _gen_four_ticket(template_name: str, numbers: list[int], _date: str, output_name: str) -> Path:
    template = pymupdf.open(Path(f"static/Boletos_{template_name.lower()}.pdf"))

    page = template[0]
    page.insert_font(fontfile=font_file, fontname=font_name)
    for k, num in enumerate(numbers):
        k *= 174
        page.insert_text(pymupdf.Point(178, 175.3 + k), f"{num}", fontname="ArialNarrow", fontsize=30)
        page.insert_text(pymupdf.Point(210, 190.5 + k), f"{_date}", fontname="ArialNarrow", fontsize=9)

    base_path.mkdir(exist_ok=True)
    output = base_path.joinpath(f"{output_name}.pdf")
    template.save(output)
    template.close()
    return output


def get_date(d: date) -> str:
    day = str(d.day).rjust(2, "0")
    month = str(d.month).rjust(2, "0")
    return f"{day}/{month}/{d.year}"


def gen_tickets(template_name: str, numbers: list[int]) -> list[Path]:
    if len(numbers) == 0:
        return []

    numbers = list(dict.fromkeys(numbers))
    numbers.sort()

    tickets = []
    today = date.today()
    today_str = get_date(today)

    if len(numbers) < 4:
        return [_gen_single_ticket(template_name, num, today_str, str(num)) for num in numbers]

    while len(numbers) % 4 != 0:
        num = numbers.pop(0)
        tickets.append(_gen_single_ticket(template_name, num, today_str, str(num)))

    k = 0
    while k < len(numbers):
        ticket_range = numbers[0 + k: 4 + k]
        name = "_".join(str(n) for n in ticket_range)
        tickets.append(_gen_four_ticket(template_name, ticket_range, today_str, name))
        k += 4

    return tickets


@app.route("/ticket", methods=["GET"])
def ticket():
    template = request.args.get("template")
    if template is None:
        template = "Gris"
    else:
        template = template.capitalize()

    if template.lower() not in ["gris", "negro"]:
        return jsonify({"message": "Las únicas opciones para 'template' son 'Gris' y 'Negro'"}), 400

    numbers = request.args.get("numbers")
    if numbers is None:
        return jsonify({"message": "Se requiere de al menos un número de boleto"}), 400

    try:
        numbers = [int(n) for n in re.findall(r"\d+", numbers)]
    except ValueError:
        return jsonify({"message": f"Los números deben ser enteros positivos entre 1 y 500"}), 400

    if not numbers:
        return jsonify({"message": "No se identificaron números validos en la petición"}), 400

    for num in numbers:
        if num < 1 or num > 500:
            return jsonify({"message": f"El número de boleto {num} no es válido"}), 400

    files = gen_tickets(template, numbers)
    return jsonify({"message": "Boletos generados", "tickets": ",".join([file.name for file in files])}), 200


@app.route("/download", methods=["GET"])
def download():
    str_filenames = request.args.get("files")
    if str_filenames is None:
        abort(400)

    files = [base_path.joinpath(name) for name in str_filenames.split(",")]

    if len(files) == 1:
        if not files[0].exists():
            abort(404)

        response = send_file(files[0], download_name=files[0].name, mimetype="application/pdf")
        response.headers["Content-Disposition"] = f"attachment; filename={files[0].name}"
        return response

    buffer = io.BytesIO()
    with ZipFile(buffer, "w", ZIP_DEFLATED) as zipf:
        for f in files:
            if not f.exists():
                abort(404)

            zipf.write(f, f.name)

    for f in files:
        f.unlink()

    buffer.seek(0)
    name = f"boletos_" + "_".join([f.name.replace(".pdf", "") for f in files]) + ".zip"
    response = send_file(buffer, download_name=name, mimetype="application/zip")
    response.headers["Content-Disposition"] = f"attachment; filename={name}"
    return response


@app.route("/")
def index():
    return render_template("index.html")


if __name__ == "__main__":
    app.run()
