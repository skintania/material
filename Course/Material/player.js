const player = document.getElementById("videoPlayer");
const catalog = document.getElementById("catalog");

function playVideo(src, el) {

    document.querySelectorAll(".item").forEach(i => {
        i.classList.remove("active");
    });

    el.classList.add("active");

    player.src = src;
    player.play();

}

fetch("videos.json")

    .then(res => res.json())

    .then(videos => {

        videos.forEach((video, index) => {

            const div = document.createElement("div");

            div.className = "item";
            div.textContent = video.title;

            div.onclick = () => playVideo(video.url, div);

            catalog.appendChild(div);

            if (index === 0) {
                div.classList.add("active");
                playVideo(video.url, div);
            }

        });

    });