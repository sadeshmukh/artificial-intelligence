function init(req, res, next) {
    req.loggedIn = req.session.loggedIn || false

    req.isAuthenticated = () => {return req.loggedIn}
    next()
}

function ensureLoggedOut(url) {

    return function(req, res, next) {
      if (req.isAuthenticated()) {
        return res.redirect(url);
      }
      next();
    }
}

function ensureLoggedIn(page) {
    url = page || '/login';
    
    return function(req, res, next) {
      if (!req.isAuthenticated()) {
        req.session.returnTo = req.originalUrl || req.url;
        return res.redirect(url);
      }
      next();
    }
}

function usernameToLowerCase(req, res, next){
    try {
        req.body.username = req.body.username.toLowerCase();
    } catch {/* Just leave it */}
    next();
}

async function getCompletion(history, openai) {
    let completion = null;
    let completionAttempts = 0;
    while (!completion) {
      completionAttempts++;
      if (completionAttempts > 3) {
        throw "Completion failed";
      }
      completion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: history,
      });
      if (
        !["length", "stop"].includes(completion.data.choices[0].finish_reason)
      ) {
        console.log("Restarting completion", completion.data);
        completion = null;
      }
    }
  
    return completion;
  }

module.exports = exports = init
exports.init = init
exports.ensureLoggedIn = ensureLoggedIn
exports.ensureLoggedOut = ensureLoggedOut
exports.usernameToLowerCase = usernameToLowerCase
exports.getCompletion = getCompletion