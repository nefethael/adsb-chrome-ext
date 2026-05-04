function injectScript(filePath) {
  
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL(filePath);
    
  script.onload = function() {
    this.remove();
  };
  (document.head || document.documentElement).appendChild(script); 
}

console.log("Extension chargée, attente 2 secondes...");

setTimeout(() => {
  console.log("Injection du script dans la page...");
  injectScript("injected.js");
}, 2000);