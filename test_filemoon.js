const url = "https://filemoon.org/e/qLQ36w1Yz19j";
fetch(url)
  .then(res => res.text())
  .then(text => {
    const images = text.match(/https:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png)/ig);
    console.log("Found images:", images);
  });
