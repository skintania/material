function goTo(course) {
  event.stopPropagation();
  window.location.href = `course.html?course=${course}`;
}

function sheet(midterm) {
  event.stopPropagation();
  window.location.href = "sheet.html";

  const langSwitch = document.getElementById('langSwitch');
  //console.log(langSwitch.checked);

  const lang = langSwitch.checked ? "ise" : "th";
  const mid = midterm ? "midterm" : "final";

  if (langSwitch.checked) {
    window.location.href = `sheet.html?lang=${lang}&mid=${mid}`;
  } else {
    window.location.href = `sheet.html?lang=${lang}&mid=${mid}`;
  }

}

const switchEl = document.getElementById("langSwitch");
const p1 = document.querySelectorAll(".fileP p");
const p2 = document.querySelectorAll(".fileB p");
switchEl.addEventListener("change", function () {
  const lang = this.checked;
  const fg = document.querySelector(".file-grid")

  const la = lang?' ISE ':' TH '

  p1.forEach(p=>{
    p.textContent = `File : Midterm [${la}]`
  })
  p2.forEach(p=>{
    p.textContent = `File : Final [${la}]`
  })

});