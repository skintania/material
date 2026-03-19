function goTo(course){
  event.stopPropagation();
  window.location.href = `course.html?course=${course}`;
  const langSwitch = document.getElementById('langSwitch');
  console.log(langSwitch.checked);
}

const switchEl = document.getElementById("langSwitch");

switchEl.addEventListener("change", function() {

  const lang = this.checked ? "inter" : "th";

  console.log("current lang =", lang);

});