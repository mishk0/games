(function(){
function Player(name, cards, view, id) {
   this.name = name;
   this.id = id;
   this.cards = cards;
   this.view = view;
   this.isGiveCard = false;
};

Player.prototype = {
    giveCard : function(battle) {
        var self = this;
        if (battle) {
            var card =  self.cards.splice(0,2);
        } else {
            var card =  self.cards.splice(0,1);
        }

        self.isGiveCard = true;
        $(document).trigger({type: "giveCardView", card: card, cards: self.cards.length, id: self.id})
        return card;
    },
    takeCards : function(cards) {
        var self = this;
        self.cards = _.union(self.cards, cards);
        $(document).trigger({type: "takeCardView", cards: self.cards.length, id: self.id})
    }
};
   var players = {};
    var cards = [
        "a2", "a3", "a4", "a5", "a6", "a7", "a8", "a9", "a10", "aJ", "aQ", "aK", "aI",
        "b2", "b3", "b4", "b5", "b6", "b7", "b8", "b9", "b10", "bJ", "bQ", "bK", "bI",
        "c2", "c3", "c4", "c5", "c6", "c7", "c8", "c9", "c10", "cJ", "cQ", "cK", "cI",
        "d2", "d3", "d4", "d5", "d6", "d7", "d8", "d9", "d10", "dJ", "dQ", "dK", "dI"
    ];

   function compare(card1, card2) {
      var c1 = card1.slice(1);
      var c2 = card2.slice(1);
      if (c1 == "J") c1 = 11;
      if (c1 == "Q") c1 = 12;
      if (c1 == "K") c1 = 13;
      if (c1 == "I") c1 = 14;
      if (c2 == "J") c2 = 11;
      if (c2 == "Q") c2 = 12;
      if (c2 == "K") c2 = 13;
      if (c2 == "I") c2 = 14;
      return +c1 > +c2 ? card1 : card2
   };
   function autoplay(playersId) {
        var n = 0
        _.each(playersId, function(i){
            n++;
            setTimeout(function(){
                $(document).trigger({
                    type : "giveCard",
                    id : i
                })
            }, n*1000) // для того чтобы игроки ходили по очереди, без setTimeout карты выкидываются враз
        })
    }

function Table(names, cardsOnTheTable) {
    this.cardsOnTheTable = [];
    this.cardsForBattle = {};
    this.battleMode = false;
    this.init(names);
};

Table.prototype = {
   init : function(names) {
       var self = this;
       cards = _.shuffle(cards);
       $.each(names, function(i,v){
           var cardsForPlayer =  _.filter(cards, function(num, key){return key % names.length == i});
           var tmpl = _.template($("#player-tmpl").html(), {name : v, id : i+1, cardNum : cardsForPlayer.length})
           players["id" + (i+1)] =  new Player(v, cardsForPlayer, tmpl, i+1);
           $(".gameDesc").append(players["id" + (i+1)].view);
       });

   },
   run : function(id){   // процесс каждого хода
       var self = this;
       var giveAll = true;
        if (self.battleMode) {
            var card = players[id].giveCard(true);
            self.cardsOnTheTable = _.union(self.cardsOnTheTable, card);
            self.cardsForBattle[id] = card[1];
        } else {
            var card = players[id].giveCard()[0];
            self.cardsOnTheTable.push(card);
            self.cardsForBattle[id] = card;
        }

       // если сходили все
       _.each(players, function(i,v){
         if (players[v].isGiveCard == false) {
            giveAll = false
         }
       });
       if (giveAll) {
           this.battle();
       }
   },
   battle : function(){   // подсчет победителя
       var self = this;

       var cards = _.values(self.cardsForBattle);
       if (window.console) {
           console.log("cardOnTable: " + self.cardsOnTheTable);
           console.log("cardsForBattle: " + cards);
       }
       var maxCard;
       for (var i = 0; i<cards.length - 1; i++) {
           if (!maxCard) {
              maxCard = compare(cards[i], cards[i+1])
           } else {
              maxCard = compare(maxCard, cards[i+1])
           }
       };
       var winners = []
       setTimeout(function(){
       _.each(self.cardsForBattle, function(i,v){
            if (maxCard.slice(1) == i.slice(1)) {
                winners.push(v);
            }
       });
       if (winners.length == 1) {
           players[winners[0]].takeCards(self.cardsOnTheTable);
           self.runEnd(winners[0]);
       } else {
           var playersWithoutCards = [];   // игроки у которых не хватает карт для войны
           var playersWithCards = [];   // игроки у которых хватает карт для войны
           _.each(winners, function(i,v){
               if (players[i].cards.length < 2) {
                   playersWithoutCards.push(i)
               } else {
                   playersWithCards.push(i)
               }
               players[i].isGiveCard = false;
           });
           if (playersWithoutCards.length) {     // если есть игроки у которых не хватает карт для войны, то забирает карты тот у которого хватает карт, если таких игроков нет, то забирает карты сидящий слева
               var win;
               if (playersWithCards.length) {
                   win = playersWithCards[0];
               } else {
                   win = playersWithoutCards[0];
               }
               players[win].takeCards(self.cardsOnTheTable);
               self.runEnd(win);
               return;
           };
           self.battleMode = true;
           self.cardsForBattle = {};
           $(document).trigger({
               type : "battle",
               ids : winners
           });
       };

       }, 1000)


   },
    runEnd : function(winnerId){  // конец хода
        this.cardsOnTheTable = [];
        this.cardsForBattle = {};
        this.battleMode = false;
        _.each(players, function(i,v){
            players[v].isGiveCard = false;
            if (players[v].cards.length == 0) {
                delete players[v];
                $(document).trigger({
                    type : "playerDeleted",
                    id : v
                });
                if (_.size(players) == 1) {
                    $(document).trigger({
                        type : "theEnd",
                        winner : _.keys(players)[0]
                    });
                }
            }
        });
        $(document).trigger({
            type : "runEnd",
            winnerId : winnerId
        });
    }
};

$(function(){
    var _autoplay;
    var table;
   $(".plus").on("click", function(){
       if ($(".playerName").length > 5 ) {
           return;
       }
       $(".players").append("<div class='playerName'><input type='text' placeholder='введите имя'/><span class='del'>&times;</span></div>");
   });
   $(".btn").on("click", function(){
       var p = [];
       var error = false;
       $(".players input").each(function(i,v){
           var name = $(this).val();
           if (name != "") {
             p.push(name);
           } else {
             error = true;
           }

       })
       if (error) {
           $(".error").show();
           return;
       }
       table = new Table(p);
       $(".enter").hide();
       $(".gameDesc").show();
       if ($(".autoplay input").prop("checked") == true) {
           _autoplay = true;
           autoplay(_.keys(players))
       }
   });
    $(document).on("click", ".del", function(){
        $(this).parent().remove();
    });

    $(document).on("click", ".giveCard", function(){
        if ($(this).hasClass("disabled") || _autoplay) {
            return;
        }
        $(document).trigger({
            type : "giveCard",
            id : $(this).parent().data("id")
        })
    })
    $(document).on("giveCard", function(e){
        table.run(e.id);
    });
    $(document).on("runEnd", function(e){
        $("[data-id="+ e.winnerId +"] .cardT:last-child").addClass("winnerCard");
        setTimeout(function(){
            $(".cardsOnTheTable").each(function(){
                $(this).html("");
            });
            $(".giveCard").removeClass("disabled");
            $(".battleTitle").remove();
            if (_autoplay) {
                autoplay(_.keys(players))
            }
        }, 1000)

    });
    $(document).on("playerDeleted", function(e){
        $("[data-id="+ e.id +"]").addClass("loose");
    });
    $(document).on("battle", function(e){
        _.each(e.ids, function(i, v){
            $("[data-id="+ i +"]").find(".giveCard").removeClass("disabled");
        });
        $(".gameDesc").append("<div class='battleTitle'>Battle Mode</div>");
        if (_autoplay) {
            autoplay(e.ids);
        }
    });
    $(document).on("giveCardView", function(e){
        var player = $("[data-id=id"+ e.id +"]");
        player.find(".cNum").html(e.cards);
        player.find(".giveCard").addClass("disabled");
        if (e.card.length == 1) {
            var card = e.card[0];
            var cardTmpl = _.template($("#card-tmpl").html(),{num: card.slice(1), suit: card.slice(0,1), battle:false})
        } else {
            var card = e.card[1];
            var cardTmpl = _.template($("#card-tmpl").html(),{num: card.slice(1), suit:card.slice(0,1), battle:true})
        }

        player.find(".cardsOnTheTable").append(cardTmpl);
    });
    $(document).on("takeCardView", function(e){
        var player = $("[data-id=id"+ e.id +"]");
        player.find(".cNum").html(e.cards);
    });
    $(document).on("click", ".theEnd a", function(){
        $(".gameDesc").html("").hide();
        players = {};
        $(".autoplay input").prop("checked", false);
        $(".players").html("<div class='playerName'><input type='text' placeholder='введите имя'/></div><div class='playerName'><input type='text' placeholder='введите имя'/></div>")
        $(".enter").fadeIn();
        return false;
    })
    $(document).on("theEnd", function(e){
        _autoplay = false;
        $(".gameDesc").html("<div class='theEnd'>Победил игрок "+players[e.winner].name+". <a href='#'>Играть еще.</a></div>")

    })

});
})()