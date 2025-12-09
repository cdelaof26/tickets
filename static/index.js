
// const HOST = "http://127.0.0.1:5000/"
const HOST = "/"

const REQUEST_BASE = {
    method: "GET",
    headers: {
        "Content-Type": "application/json"
    },
};

let template = "gris";
let associate = true;

function set_property(type, is_gray) {
    const edit_template = type === "template";
    const e1 = document.getElementById(edit_template ? "gray" : "yes-associate");
    const e2 = document.getElementById(edit_template ? "black" : "no-associate");

    if (is_gray) {
        e1.classList.add("bg-sky-700", "text-white");
        e1.classList.remove("bg-sidebar-0", "dark:bg-sidebar-1");

        e2.classList.remove("bg-sky-700", "text-white");
        e2.classList.add("bg-sidebar-0", "dark:bg-sidebar-1");
        if (edit_template)
            template = "gris";
        else
            associate = true;
    } else {
        e1.classList.remove("bg-sky-700", "text-white");
        e1.classList.add("bg-sidebar-0", "dark:bg-sidebar-1");

        e2.classList.add("bg-sky-700", "text-white");
        e2.classList.remove("bg-sidebar-0", "dark:bg-sidebar-1");
        if (edit_template)
            template = "negro";
        else
            associate = false;
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

    fetch(HOST + `ticket?numbers=${numbers}&template=${template}&associate=${associate}`, REQUEST_BASE).then(async (response) => {
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
