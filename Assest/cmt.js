const webhookURL = "https://discord.com/api/webhooks/1483172061303148717/8e1m1YP5g8i5J_YCIOU77w4dGCui1L2FCakqz7cJWHvmsIAio9m5Y1alTIiWmAh7bmx_"

const btn = document.getElementById("commentBtn")
const popup = document.getElementById("commentPopup")

btn.onclick = togglePopup

function togglePopup() {
    popup.classList.toggle("hidden")
}

async function sendComment() {

    const text = document.getElementById("commentText").value

    if (!text) {
        alert("Leave the comment here")
        return
    }

    const res = await fetch("/Assest/emb.json")
    const data = await res.json()



    data.embeds[0].fields[0].value = text

    fetch(webhookURL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    })

        .then(() => {
            alert("Comment Sending successfully")
            document.getElementById("commentText").value = ""
            togglePopup()
        })

        .catch(() => {
            alert("Message Error")
        })

}