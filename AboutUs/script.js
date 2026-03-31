gsap.registerPlugin(ScrollTrigger);

gsap.to(".header-text i", {
  y : 5,
  duration: 0.5,
  repeat: -1,
  yoyo: true,
  ease: "power1.inOut"
});

gsap.to(".img2", {
  opacity:0
});

const tl = gsap.timeline({
  scrollTrigger: {
    trigger: ".parallax-header",
    start: "top top",
    end: "+=5000",
    scrub: true,
    pin: true,
  }
});

const sk = gsap.timeline({
  scrollTrigger: {
    trigger: ".story",
    start: "top top",
    end: "+=5000",
    scrub: true,
    pin: true,
  }
});

// sequence animation

tl.from(".header-logo", {
  opacity: 0,
  y: -50,
  duration: 1,
  delay: 0.5,
  ease: "power2.out"
},"-=0.5")
.to(".parallax-header", {
  scale: 1.2,
  duration: 1,
  ease: "power2.out"
},"-=0.5")
.to(".header-text", {
  opacity: 0
},"-=0.5")
.to(".header-logo", {
  scale: 5,
  opacity: 0,
  duration: 1,
  ease: "power2.out"
},"-=0.5")
.to("body", {
  "background": "#2a6eeb",
  duration: 1,
},"+=0.1")


sk.to(".img1", {
  scale: 1.5,
  transformOrigin: "51.5% 85%",
  delay: 0.5,
  duration: 1,
})
.to(".img2", {
  opacity: 1,
  duration: 1,
})
.to(".img1", {
  opacity: 0,
  duration: 1,
},"-=0.7")
.to(".img2", {
  scale: 1.1,
  duration: 1,
},"<")
