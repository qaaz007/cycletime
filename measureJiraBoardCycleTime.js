var http = require("https");


//Get the issues from sprint and calcualte cycle time
var options = {
  "method": "GET",
  "hostname": "myhost.atlassian.net",
  "port": null,
  "path": "/rest/api/2/search?jql=Sprint%3D" + "SPRINTID" + "&expand=changelog",
  "headers": {
    "authorization": "AUTH KEY",
    "cache-control": "no-cache",
    "postman-token": "POSTMAN TOKEN IF YOU ARE USING ONE"
  }
};

if(process.argv[2] !== undefined) {
    var passedSprintId = process.argv[2];
    options.path = "/rest/api/2/search?jql=Sprint%3D" + passedSprintId + "&expand=changelog"
}

var req = http.request(options, function (res) {
  var chunks = [];

  res.on("data", function (chunk) {
    chunks.push(chunk);
  });

  res.on("end", function () {
      var body = Buffer.concat(chunks);
      var sprintIssues = JSON.parse(body.toString());
      
      var numberOfIssues = sprintIssues.total;
      var issueCounter = {
          "story": 0,
          "bug": 0,
          "total": 0
      };
      var sumOfCycleTime = 0;
      
      for(var i=0; i < numberOfIssues; i++) {
          var issue = sprintIssues.issues[i];
          var issueType = issue.fields.issuetype.name;
          var issueChangeLog = issue.changelog;
          var issueKey = issue.key;

//if(issueKey === 'KEY') {

          
          //calculate start/stop time
          var startTime = null;
          var stopTime = null;
    
          if((issueType == 'Bug') || (issueType == 'Story')) {
              
              
                  for(var j=0; j < issueChangeLog.total; j++) {
                      var historyLogId = issueChangeLog.histories[j].id;
                      var historyLogTime = issueChangeLog.histories[j].created;
//                    console.log(historyLogId);                      
                      var historyLogItem = issueChangeLog.histories[j].items;
                      
                      for(var k=0; k < historyLogItem.length; k++) {
                          var field = historyLogItem[k].field;
                          var from = historyLogItem[k].fromString;
                          var to = historyLogItem[k].toString;
//A == To Do, Development, Done
//MOW == To Do, In Progress, Done
//I ==                           
                          if(field == 'status') {
                              if((from === 'To Do') && (isValidState(to, ['In Progress', 'Development']))) {
                                  startTime = historyLogTime;
                                  
                              }
                              else if(((from === 'Done') && (isValidState(to, ['In Progress', 'Development']))) 
                                        && (startTime === null)) {                                  
                                  startTime = historyLogTime;
                              }
                              else if((isValidState(from, ['In Progress', 'Development'])) && (to === 'Done')) {
                                  stopTime = historyLogTime;
                              }
                              console.log(from + ' -> ' + to + ' ->' + historyLogTime);
                          }
                      }
                  }
                  
                  //calcualte cycle time
                  if((startTime !== null) && (stopTime !== null)) {
                      var start = new Date(startTime).getTime();
                      var stop = new Date(stopTime).getTime();
                      var diff = stop - start;
                      sumOfCycleTime += diff;
                      console.log(start + ' -- ' + stop);                
                      
                      var cycleTime = getDateIntervalText(diff);

                  }

                  console.log('-----------------');
                  console.log(issueKey + ' = ' + cycleTime);
                  console.log('-----------------');
                  console.log('\n');              
              
              //console.log(issue.key + ' == ' + issueType + ': ChangeLogTotal = ' + issueChangeLog.total);

              // Count issue types
              if(issueType === 'Story') {
                  issueCounter.story += 1;
              }
              else if(issueType === 'Bug') {
                  issueCounter.bug += 1;
              }
              
              issueCounter.total += 1;
          }
    
//} //end temp location
          
      }
      
      if(passedSprintId !== undefined) {
          console.log('Sprint Id: ' + passedSprintId);
      }
      console.log('Stories=' + issueCounter.story + ' Bugs=' + issueCounter.bug + ' Total=' + issueCounter.total + '\n');
      
      //calcualte average cycle time for a sprint
      var averageCycleTime = getDateIntervalText(sumOfCycleTime/issueCounter.total);
      console.log('Average Cycle Time in Sprint= ' + averageCycleTime);
      
      
      
  });
});

  var getDateInterval = function (cycleTime) {
    var days = cycleTime / (24 * 3600 * 1000);
    var dayFraction = days % 1;
    var hours = dayFraction * 24;
    var minutesFraction = hours % 1;
    var minutes = minutesFraction * 60;

    return {
    days: Math.floor(days),
    hours: Math.floor(hours),
    minutes: Math.floor(minutes)
    };
  };

  var getDateIntervalText = function (cycleTime) {
      var diffObj = getDateInterval(cycleTime);
      return diffObj.days + 'd ' + diffObj.hours + 'h ' + diffObj.minutes + 'm';
  };   

var isValidState = function (needle, haystack) {
    var length = haystack.length;
    for(var i = 0; i < length; i++) {
        if(haystack[i] === needle) return true;
    }
    return false;
};



req.end();