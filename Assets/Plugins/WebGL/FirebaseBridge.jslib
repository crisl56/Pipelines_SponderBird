var FirebaseBridgeLib = {
    InitFirebaseBridge: function () {
        if (!window.__fbAuth) {
            // window variables are usually called with __
            window.__fbAuth = { uid: null, idToken: null, displayName: null, projectId: null }
        }

        function handleAuth(data) {
            window.__fbAuth.uid = data.uid;
            window.__fbAuth.displayName = data.displayName || "Player";
            window.__fbAuth.idToken = data.idToken;
            window.__fbAuth.projectId = data.projectId = data.projectId || "";

            var payload = JSON.stringify(window.__fbAuth);

            // sends message to unity
            // first arg - find that object
            // second arg - function to call on that object
            // last arg - payload stuff
            SendMessage("GameManager", "OnAuthReceived", payload);

            if (window.parent && window.parent !== window) {
                window.parent.postMessage({ type: "firebase-auth-ack" }, "*");
                console.log("Send ack to portal");
            }
        }

        // happens if the window reloads
        // lets data persist when unity scene resets by keeping data in the website.
        if (!window.__firebaseBridgeInit) {
            window.__firebaseBridgeInit = true;

            window.addEventListener("message", function (event) {
                var data = event.data;

                if (!data || data.type !== "firebase-auth") return;
                handleAuth(data);
            })

            console.log("Listener Registered. Waiting auth from portal.")
        }

        // unity scene reload info
        if (window.__fbAuth && window.__fbAuth.uid && window.__fbAuth.idToken) {
            var payload = JSON.stringify(window.__fbAuth);
            SendMessage("FirebaseManager", "OnAuthReceived", payload);
        }

    },

    SubmitScoreToFirestore: function (jsonBodyPtr) {
        var jsonBody = UTF8ToString(jsonBodyPtr);
        var parsed = JSON.parse(jsonBody);

        var auth = window.__fbAuth;
        if (!auth || !auth.idToken || !auth.projectId) {
            console.warn("No Auth, score not submitted");
            return;
        }

        var baseUrl = "https://firestore.googleapis.com/v1/projects/" + auth.projectId + "/databases/(default)/documents";

        var headers = {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + auth.idToken
        };

        var scoreDoc = {
            fields: {
                userId: { stringValue: auth.uid },
                score: { integerValue: String(parsed.score) },
                pipes: { integerValue: String(parsed.pipes) },
                duration: { integerValue: String(parsed.duration) },
                timestamp: { timestampValue: new Date().toISOString() }
            }
        }

        fetch(baseUrl + "/scores", {
            method: "POST",
            headers: headers,
            body: JSON.stringify(scoreDoc)
        })
            .then(function (res) { return res.json(); })
            .then(function (data) { console.log("Score saved:", data.name); })
            .catch(function (error) { console.error("Score POST failed:", error); });
        // jslib has no f string D:

        var userDocUrl = baseUrl + "/users/" + auth.uid;

        fetch(userDocUrl, {
            method: "GET",
            headers: headers,
        })
            .then(function (res) { return res.json() })
            .then(function (doc) {
                var currentHigh = 0;
                var currentGames = 0;

                if (doc.fields) {
                    if (doc.fields.highScore) currentHigh = parseInt(doc.fields.highScore.integerValue || "0");
                    if (doc.fields.gamesPlayed) currentGames = parseInt(doc.fields.gamesPlayed.integerValue || "0");
                }

                var newHigh = Math.max(currentHigh, parsed.score);
                var newGames = currentGames + 1;

                var patchBody = {
                    fields: {
                        highScore: { integerValue: String(newHigh) },
                        gamesPlayed: { integerValue: String(newGames) }
                    }
                };

                return fetch(userDocUrl + "?updateMask.fieldPaths=highScore&updateMask.fieldPaths=gamesPlayed", {
                    method: "PATCH",
                    headers: headers,
                    body: JSON.stringify(patchBody)
                });
            })
            .then(function (res) { return res.json(); })
            .then(function (data) { console.log("User profile updated:", data.name); })
            .catch(function (error) { console.error("User PATCH failed:", error); });
    }
};

mergeInto(LibraryManager.library, {

    InitFirebaseBridge: function () {
        if (!window.__fbAuth) {
            window.__fbAuth = { uid: null, idToken: null, displayName: null, projectId: null };
        }

        function handleAuth(data) {
            window.__fbAuth.uid = data.uid;
            window.__fbAuth.displayName = data.displayName || "Player";
            window.__fbAuth.idToken = data.idToken;
            window.__fbAuth.projectId = data.projectId || "";

            var payload = JSON.stringify(window.__fbAuth);
            SendMessage("FirebaseManager", "OnAuthReceived", payload);

            if (window.parent && window.parent !== window) {
                window.parent.postMessage({ type: "firebase-auth-ack" }, "*");
                console.log("Sent ack to portal");
            }
        }

        if (!window.__firebaseBridgeInit) {
            window.__firebaseBridgeInit = true;

            window.addEventListener("message", function (event) {
                var data = event.data;
                if (!data || data.type !== "firebase-auth") return;
                handleAuth(data);
            });

            console.log("Listener registered. Waiting for auth from portal.");
        }

        if (window.__fbAuth && window.__fbAuth.uid && window.__fbAuth.idToken) {
            SendMessage("FirebaseManager", "OnAuthReceived", JSON.stringify(window.__fbAuth));
        }
    },

    StoreAuthToken: function (uidPtr, tokenPtr) {
        console.log("StoreAuthToken called, uid:", UTF8ToString(uidPtr));
    },

    SubmitScoreToFirestore: function (jsonBodyPtr) {
        var parsed = JSON.parse(UTF8ToString(jsonBodyPtr));
        var auth = window.__fbAuth;

        if (!auth || !auth.uid || !auth.idToken) {
            console.warn("SubmitScoreToFirestore: Not authenticated, aborting.");
            return;
        }

        var headers = {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + auth.idToken
        };

        var baseUrl = "https://firestore.googleapis.com/v1/projects/" + auth.projectId + "/databases/(default)/documents";
        var userDocUrl = baseUrl + "/users/" + auth.uid;

        // POST to scores collection
        fetch(baseUrl + "/scores", {
            method: "POST",
            headers: headers,
            body: JSON.stringify({
                fields: {
                    userId:      { stringValue: auth.uid },
                    playerName:  { stringValue: auth.displayName || "Player" },
                    playerPhoto: { nullValue: null },
                    score:       { integerValue: String(parsed.score) },
                    pipes:       { integerValue: String(parsed.pipes) },
                    jumps:       { integerValue: String(parsed.jumps) },
                    duration:    { integerValue: String(parsed.duration) },
                    timestamp:   { timestampValue: new Date().toISOString() },
                    isMock:      { booleanValue: false }
                }
            })
        })
        .then(function(r) { return r.json(); })
        .then(function(d) { console.log("Score saved:", d.name); })
        .catch(function(e) { console.error("Score POST failed:", e); });

        // GET then PATCH user doc
        fetch(userDocUrl, { headers: headers })
        .then(function(r) { return r.json(); })
        .then(function(doc) {
            var fields = doc.fields || {};
            var get = function(f) {
                return fields[f] ? parseInt(fields[f].integerValue || 0) : 0;
            };

            var body = {
                fields: {
                    highScore:   { integerValue: String(Math.max(get("highScore"), parsed.score)) },
                    gamesPlayed: { integerValue: String(get("gamesPlayed") + 1) },
                    totalScore:  { integerValue: String(get("totalScore")  + parsed.score) },
                    totalJumps:  { integerValue: String(get("totalJumps")  + parsed.jumps) },
                    totalClicks: { integerValue: String(get("totalClicks") + parsed.clicks) },
                    totalPipes:  { integerValue: String(get("totalPipes")  + parsed.pipes) },
                }
            };

            var mask = Object.keys(body.fields)
                .map(function(k) { return "updateMask.fieldPaths=" + k; })
                .join("&");

            return fetch(userDocUrl + "?" + mask, {
                method: "PATCH",
                headers: headers,
                body: JSON.stringify(body)
            });
        })
        .then(function(r) { return r.json(); })
        .then(function(d) { console.log("User profile updated:", d.name); })
        .catch(function(e) { console.error("User PATCH failed:", e); });
    }

});