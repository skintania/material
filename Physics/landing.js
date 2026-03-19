function goTo(course){
  event.stopPropagation();
  window.location.href = `course.html?course=${course}`;
}

function sheet(midterm){
  event.stopPropagation();
  window.location.href = "sheet.html";

  const langSwitch = document.getElementById('langSwitch');
  //console.log(langSwitch.checked);

  const lang = langSwitch.checked ? "ise" : "th";
  const mid = midterm ? "midterm" : "final";

  if(langSwitch.checked){
    window.location.href = `sheet.html?lang=${lang}&mid=${mid}`;
  }else{
    window.location.href = `sheet.html?lang=${lang}&mid=${mid}`;
  }

}

/*const switchEl = document.getElementById("langSwitch");

switchEl.addEventListener("change", function() {

  const lang = this.checked ? "ise" : "th";

  console.log("current lang =", lang);

});*/