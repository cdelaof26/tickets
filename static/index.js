
// const HOST = "http://127.0.0.1:5000/"
const HOST = "/"

const REQUEST_BASE = {
    method: "GET",
    headers: {
        "Content-Type": "application/json"
    },
};

let template = "gris";

function set_template(is_gray) {
    const gray = document.getElementById("gray");
    const black = document.getElementById("black");

    if (is_gray) {
        gray.classList.add("bg-sky-700", "text-white");
        gray.classList.remove("bg-sidebar-0", "dark:bg-sidebar-1");

        black.classList.remove("bg-sky-700", "text-white");
        black.classList.add("bg-sidebar-0", "dark:bg-sidebar-1");
        template = "gris";
    } else {
        gray.classList.remove("bg-sky-700", "text-white");
        gray.classList.add("bg-sidebar-0", "dark:bg-sidebar-1");

        black.classList.add("bg-sky-700", "text-white");
        black.classList.remove("bg-sidebar-0", "dark:bg-sidebar-1");
        template = "negro";
    }
}

async function download_ticket(files) {
    const err = document.getElementById("error");

    const response = await fetch(HOST + `download?files=${files}`);
    if (response.status !== 200) {
        err.classList.remove("hidden");
        err.lastChild.textContent = "Ocurrió un error inesperado al descargar los tickets";
        throw new Error("Internal server error");
    }

    let filename = "download.zip";
    const disposition = response.headers.get("Content-Disposition");
    if (disposition && disposition.indexOf("filename=") !== -1) {
        const matches = disposition.match(/filename="?.+"?/g);
        if (matches != null && matches[0])
            filename = matches[0].replace(/['"]/g, "").replace("filename=", "");
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
}

function gen_ticket() {
    const err = document.getElementById("error");
    let numbers = document.getElementById("numbers-area").value;
    numbers = numbers.trim();

    fetch(HOST + `ticket?numbers=${numbers}&template=${template}`, REQUEST_BASE).then(async (response) => {
        const json = JSON.parse(await response.text());

        if (response.status !== 200) {
            err.classList.remove("hidden");
            err.lastChild.textContent = json["message"];
            return;
        }

        err.classList.add("hidden");

        download_ticket(json["tickets"]);
    }).catch(err => {
        console.error(err);
    });
}
