gsap.registerPlugin(ScrollTrigger);

const logo = document.getElementById("logo");

gsap.from(".header-text", {
  y: 50,
  opacity: 0,
  scrollTrigger: {
    trigger: ".s1",
    start: "top top",
    end: "+=500",
    toggleActions: "play none none reverse", 
    pin:true,
  }
});
gsap.to(".header-text", {
  y: 0,
  scrollTrigger: {
    trigger: ".s1",
    start: "top top",
    end: "bottom 50%",
    toggleActions: "play none none reverse", 
    scrub: true,
    markers: true,
  }
});

gsap.to(".logo", {
  scale: 5,
  scrollTrigger: {
    trigger: ".s2",
    start: "top top",
    end: "+=800",
    scrub: true,
    pin: true,
    markers: true,
  }
});