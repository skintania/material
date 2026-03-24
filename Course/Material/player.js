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


fetch("https://skintania-api.skintania143.workers.dev/course?path=material%2F")

    .then(res => res.json())
    
    .then(videos => {
        console.log(videos)
        videos.forEach((video, index) => {

            const div = document.createElement("div");
            div.className = "item";
            div.textContent = video.name;
            
            
            div.onclick = () => playVideo(video.link, div);

            catalog.appendChild(div);

            if (index === 0) {
                div.classList.add("active");
                playVideo(video.link, div);
            }

        });

    });