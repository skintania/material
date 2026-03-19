const params = new URLSearchParams(window.location.search);
const lang = params.get("lang");
const mid = params.get("mid");

fetch("sheetdata/sheettracking.json")
    .then(response => response.json())
    .then(data => {
        const fileName = data[lang][mid];
        document.getElementById("sheet-title").textContent = `${lang} Physics ${mid} Sheet`;
        document.getElementById("pdf-iframe").src = `sheetdata/${fileName}`;
    })
    .catch(error => {
        console.error("Error fetching sheet tracking data:", error);
        alert("Sorry, we couldn't load the sheet. Please try again later.");
    });
