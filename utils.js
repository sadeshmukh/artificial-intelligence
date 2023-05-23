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

module.exports = exports = init
exports.init = init
exports.ensureLoggedIn = ensureLoggedIn
exports.ensureLoggedOut = ensureLoggedOut
exports.usernameToLowerCase = usernameToLowerCase