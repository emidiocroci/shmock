var supertest = require("supertest");
var shmock = require("..");
var should = require('should');

describe("shmock", function() {
  it("Should be able to bind to a specific port", function(done) {
    var mock = shmock(9000);

    supertest(mock).get("/").expect(404, done);
  });

  it("Should be able to bind to an arbitrary", function(done) {
    var mock = shmock();

    supertest(mock).get("/").expect(404, done);
  });

  describe("Request", function() {
    var mock;
    var test;

    before(function() {
      mock = shmock(9001);
      test = supertest(mock);
    });

    beforeEach(function() {
      mock.clean();
    });


    it("Should remove by default expectations after meeting them", function(done) {
      var handler = mock.get("/foo").reply(200);

      test.get("/foo").expect(200, function() {
        test.get("/foo").expect(404, done);
      });
    });

    it("Should not remove expectations after meeting them if they were persisted", function(done) {
      var handler = mock.get("/persisted").persist().reply(200);

      test.get("/persisted").expect(200, function() {
        test.get("/persisted").expect(200).end(function(error, response) {
          test.get("/persisted").expect(200).end(function(error, response) {
            if (error) return done(error);
            handler.isDone.should.be.ok;
            done();
          });     
        });
      });
    });

    it("Should return a handler to verify if a request has been made", function(done) {
      var handler = mock.get("/foo").reply(200);

      handler.isDone.should.not.be.ok;
      handler.done.should.throw();

      test.get("/foo").expect(200, function() {
        handler.isDone.should.be.ok;
        done();
      });
    });

    it("Should be able to mock a any http method", function(done) {
      mock.get("/foo").reply(200);

      test.get("/foo").expect(200, done);
    });

    it("Should fail if expected request body doesn't match", function(done) {
      mock.get("/foo").send("foobar").reply(200);

      test.get("/foo").end.should.throw();
      done();
    });

    it("Should succeed if expected request body match the one sent", function(done) {
      mock.post("/get").send("lalalala").set("Content-Type", "text/plain").reply(200);

      test.post("/get").set("Content-Type", "text/plain").send("lalalala").expect(200, done);
    });

    it("Should succeed if expected request json match the one sent", function(done) {
      mock.post("/get").send({foo: "bar", bar: "foo"}).reply(200);

      test.post("/get").send({bar: "foo", foo: "bar"}).expect(200, done);
    });

    it("Should match query parameters", function(done) {
      mock.post("/get")
        .query({total: 10, limit: 1})
        .query({foo: "bar"})
        .query("a=b&c=d")
        .query("x=y")
        .reply(200);

      test.post("/get").query({total: 10, limit: 1, foo: "bar", a: "b", c: "d", x: "y"}).expect(200, done);
    });

    it("Should fail if headers are not matched", function(done) {
      mock.post("/get").set("Content-Type", "application/json").reply(200);

      test.post("/get").end.should.throw();
      done();
    });

    it("Should succeed if headers are matched", function(done) {
      mock.post("/get").set("Content-Type", "application/json").reply(200);

      test.post("/get").set("Content-Type", "application/json").send({}).expect(200, done);
    });

    it("Should be able to wait a specificed number of ms for expectation to be met", function(done) {
      var h = mock.get("/foo").reply(200);

      setTimeout(function() {
        test.get("/foo").expect(200, function() {});
      }, 20);

      h.wait(10, function(err) {
        err.should.not.be.null;

        h.wait(30, done);
      });
    });

    it("Should be able to wait a default number of ms for expectation to be met", function(done) {
      var h = mock.get("/foo").reply(200);

      h.defaults.waitTimeout = 10;

      setTimeout(function() {
        test.get("/foo").expect(200, function() {});
      }, 20);

      h.wait(function(err) {
        err.should.not.be.null;
        done();
      });
    });

    it("Should be able to delay a reply for a specified amount of ms", function(done) {
      mock.get("/foo").delay(30).reply(200);

      test.get("/foo").timeout(10).end(function(err) {
        err.should.not.be.null;

        test.get("/foo").timeout(50).expect(200, function(err) {
          (err == null).should.be.ok;

          mock.get("/foobar").reply(200);
          test.get("/foobar").timeout(10).expect(200, done);
        });
      });
    });

    it("Should be able to delay a reply for a random amount of ms", function(done) {
      mock.get("/foo").randomDelay(30, 100).reply(200);

      test.get("/foo").timeout(10).end(function(err) {
        err.should.not.be.null;

        test.get("/foo").timeout(120).expect(200, function(err) {
          console.log(err);
          (err == null).should.be.ok;

          mock.get("/foobar").reply(200);
          test.get("/foobar").timeout(10).expect(200, done);
        });
      });
    });

    it('Should forward the received request to the wait callback', function(done) {
      var h = mock.post("/foo").reply(200);

      h.defaults.waitTimeout = 10;

      h.wait(function(err, req) {
        req.body.x.should.be.equal(1);
        done();
      });

      test.post("/foo").send({x: 1}).expect(200, function() {});
    });
  });
});
