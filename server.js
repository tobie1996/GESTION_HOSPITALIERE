const pool = require("./config");
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const pg = require("pg");
const app = express();
const path = require("path");
app.use(express.static("public"));
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const session = require("express-session");

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());



// PARTIE SECRETAIRE MEDICAL OU SUPER ADMIN

// les diferent routes pour menu super admin

app.get("/admin_parametres", (req, res) => {
  res.render("admin/parametres");
});

app.get("/index_service", async (req, res) => {
  // notif vers index_admin
  pool.query(
    "SELECT * FROM lit ORDER BY id ASC",
    async (error, results) => {
      if (error) {
        throw error;
      }
      const result1 = await pool.query("SELECT * FROM salle ORDER BY id ASC");
      const result2 = await pool.query("SELECT * FROM service ORDER BY id ASC");
      const result3 = await pool.query("SELECT * FROM garde ORDER BY id ASC");
      res.render("service/index_services", {
        lit: results.rows,
        salle: result1.rows,
        service: result2.rows,
        garde: result3.rows,
      });
    }
  );
});

app.get("/admin_notification", async (req, res) => {
  // notif vers admin notifif
  try {
    const result = await pool.query(
      "SELECT * FROM notifications WHERE lu = false ORDER BY date DESC"
    );
    res.render("admin/notification", { notifications: result.rows });
  } catch (err) {
    console.error(err);
    res.send("Error " + err);
  }
});

// notifications vers Médecin



app.get("/medecin_message", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM notifications WHERE lu = false"
    );
    res.render("medecin/message", { notifications: result.rows });
  } catch (err) {
    console.error(err);
    res.send("Error " + err);
  }
});


app.get("/medecin_dossier", async (req, res) => {
  // notif vers admin
  try {
    const result = await pool.query(
      "SELECT * FROM notifications WHERE lu = false"
    );
    res.render("medecin/dossier", { notifications: result.rows });
  } catch (err) {
    console.error(err);
    res.send("Error " + err);
  }
});





// 1-Gestion patient
// dans cette meme route nous executons plusieurs requettes dans des multselect

app.get("/admin_patient", async (req, res) => {
  try {
    const results = await pool.query("select * from patient order by id asc");
    const result = await pool.query("select nom_service from service"); //pour liste deroulante
    const nomsservice = result.rows.map((row) => row.nom_service);

    const result1 = await pool.query("select distinct nom from medecin"); //pour liste deroulante
    const medecins = result1.rows.map((row) => [row.nom]);

    const result2 = await pool.query("select numero from lit"); //pour liste deroulante
    const lits = result2.rows.map((row) => row.numero);

    const result3 = await pool.query("select numero from salle"); //pour liste deroulante
    const salles = result3.rows.map((row) => row.numero);

    const result4 = await pool.query("select nom from garde"); //pour liste deroulante
    const gardes = result4.rows.map((row) => [row.nom]);
    const result5 = await pool.query("select nom from infirmiere"); //pour liste deroulante
    const infirmieres = result5.rows.map((row) => [row.nom]);
    const notifications = await pool.query(
      "select * from notifications where lu = false"
    );

    res.render("admin/patient", {
      patient: results.rows,
      services: nomsservice,
      notifications: notifications.rows,
      medecins: medecins,
      lits: lits,
      salles: salles,
      gardes: gardes,
      infirmieres: infirmieres,
    });
  } catch (error) {
    throw error;
  }
});

app.post("/edit/:id", (req, res) => {
  const { id } = req.params;
  const { nom,datenaiss, sexe, tel, cni, service, email } = req.body;
  pool.query(
    "UPDATE patient SET nom = $1, datenaiss = $2, sexe = $3, tel = $4, cni = $5, service = $6, email= $7 WHERE id = $8",
    [nom, datenaiss, sexe, tel, cni, service, email, id],
    (error, results) => {
      if (error) {
        throw error;
      }
      res.redirect(req.headers.referer);
    }
  );
});
// ajouter patient avec ajout notification + evoi sms email
app.post("/add", async (req, res) => {
  const { id, nom, datenaiss, sexe, tel, cni, service, email } =req.body;
  const message = "Nouveau patient  enregistré";
  
  hashedPassword = await bcrypt.hash(id, 10); //haashage du mot de passe et l'inserer dans users

  pool.query(
    `SELECT * FROM users
    WHERE email = $1`,
    [email],
    async (err, results) => {
      if (err) {
        console.log(err);
      }
      console.log(results.rows);
      // si l'email existe déja
      if (results.rows.length > 0) {
        
        // si tout est OK 
      } else {
        
        try {
          await pool.query(
            "INSERT INTO patient (id, nom, datenaiss, sexe, tel, cni, service, email) VALUES ($1, $2, $3, $4, $5, $6, $7,$8)",
            [id, nom, datenaiss, sexe, tel, cni, service, email]
          );
      
          await pool.query(
            "INSERT INTO notifications (message, lu, date,nom) VALUES ($1, $2, $3,$4)",
            [message, false, new Date(),nom]
          );
      
         
         
          await pool.query("INSERT INTO users (email,password,nom) VALUES ($1, $2,$3)", [
            email,
            hashedPassword,
            nom
          ]);
          // Envoyer un e-mail à l'utilisateur
          const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
              user: "tobiemba@gmail.com",
              pass: "xfvilqzorefbeere", // autre  bvgofstrxorqoota
            },
          });
      
          const mailOptions = {
            from: "tobiemba@gmail.com",
            to: email,
            subject: "SERVICE DE SANTE +",
            text: `Bienvenu(e) Mr/Mme ${nom} merci de vous être enregistré au suivi de soin Médicaux  votre mot de passe de connexion est ${id} 
             connectez vous appartir de ce lien http://localhost:4000/index_login
            !`,
          };
      
          transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
              throw error;
            } else {
              console.log("E-mail envoyé : " + info.response);
            }
          });
          res.redirect(req.headers.referer);
        } catch (error) {
          console.error(error);
          throw error;
        }
      }
    }
  )
  
});

// ajout dossier medical envoi email pendant des intervalles de temps
app.post("/addossier", async (req, res) => {
  const {
    id,
    nom,
    motif,
    diagnostique,
    date_admis,
    date_sortie,
    etat_sortie,
    medecin,
    infirmier,
    salle,
    lit,
    garde,
    tel,
    service,
  } = req.body;

  const {email} =req.body;
  const message = "Nouveau dossier médical crée";
  const soin = "pas de soins pour le moment";
  const medicament = "Aucune prescription pour l'instant";
  const rendez = "Aucun rendez-vous pour l'instant";
  const resultat_analyse ="Pas de résultats pour le moment";
  const resultat_radio ="Pas de résultats pour le moment";


  try {
    await pool.query(
      "INSERT INTO admission (id,nom, motif, diagnostique, date_admis, date_sortie,etat_sortie, medecin, infirmier, salle, lit, garde) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,$12)",
      [
        id,
        nom,
        motif,
        diagnostique,
        date_admis,
        date_sortie,
        etat_sortie,
        medecin,
        infirmier,
        salle,
        lit,
        garde,
      ]
    );

    await pool.query(
      "INSERT INTO resultat (id, nom, resultat_analyse, resultat_radio, email,tel,medecin ,service) VALUES ($1, $2, $3, $4, $5, $6, $7,$8)",
      [id, nom, resultat_analyse, resultat_radio, email, tel,medecin, service]
    );
    await pool.query(
      "INSERT INTO revisions (id, nom, medicament, rendez, email,tel,medecin, service) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
      [id, nom, medicament, rendez, email,tel,medecin, service]
    );

    await pool.query(
      "INSERT INTO notifications (message, lu, date,nom) VALUES ($1, $2, $3,$4)",
      [message, false, new Date(),nom]
    );

    await pool.query(
      "INSERT INTO soin (id, nom,soin, salle,lit,infirmier,medecin, motif) VALUES ($1, $2, $3, $4, $5, $6,$7,$8)",
      [id, nom,soin, salle,lit,infirmier,medecin,motif]
    );

    res.redirect(req.headers.referer);
  } catch (error) {
    
  }
});

app.post("/delete/:id", (req, res) => {
  const message = "Un  patient Supprimé";
  const { id} = req.params;
  
pool.query(
  "DELETE FROM patient WHERE id = $1",
  [id],
  async (error, results) => {
    if (error) {
      throw error;
    }

    await pool.query(
      "INSERT INTO notifications (message, lu, date) VALUES ($1, $2, $3)",
      [message, false, new Date()]
    );

    await pool.query(
      "DELETE FROM revisions WHERE id = $1",
      [id]
    );
    await pool.query(
      "DELETE FROM admission WHERE id = $1",
      [id]
    );
    await pool.query(
      "DELETE FROM resultat WHERE id = $1",
      [id]
    );
    await pool.query(
      "DELETE FROM soin WHERE id = $1",
      [id]
    );
    res.redirect(req.headers.referer);
  }
);

});

// utilisation du muliselect pour les service venant de la table service


/// ESPACE SERVICE HOSPITALIER
// 2- gestion garde malade

app.get("/service_garde", (req, res) => {
  pool.query("SELECT * FROM garde ORDER BY id ASC", (error, results) => {
    if (error) {
      throw error;
    }
    const garde = results.rows;
    res.render("service/service_garde", { garde: garde });
  });
});

app.post("/add4", (req, res) => {
  const { nom, prenom, lien, adresse, tel, date_debut, date_fin } = req.body;
  pool.query(
    "INSERT INTO garde (nom, prenom, lien, adresse, tel ,date_debut ,date_fin) VALUES ($1, $2, $3, $4, $5, $6, $7)",
    [nom, prenom, lien, adresse, tel, date_debut, date_fin],
    (error, results) => {
      if (error) {
        throw error;
      }
      res.redirect(req.headers.referer);
    }
  );
});

app.post("/delete4/:id", (req, res) => {
  const { id } = req.params;
  pool.query("DELETE FROM garde WHERE id = $1", [id], (error, results) => {
    if (error) {
      throw error;
    }
    res.redirect(req.headers.referer);
  });
});

app.post("/edit4/:id", (req, res) => {
  const { id } = req.params;
  const { nom, prenom, lien, adresse, tel, date_debut, date_fin } = req.body;
  pool.query(
    "UPDATE garde SET nom = $1, prenom = $2, lien = $3, adresse = $4, tel = $5, date_debut = $6, date_fin = $7 WHERE id = $8",
    [nom, prenom, lien, adresse, tel, date_debut, date_fin, id],
    (error, results) => {
      if (error) {
        throw error;
      }
      res.redirect(req.headers.referer);
    }
  );
});


// 4- gestion des medecins avec notification

app.get("/admin_medecin", async (req, res) => {
  pool.query(
    "SELECT * FROM medecin ORDER BY id ASC",
    async (error, results) => {
      if (error) {
        throw error;
      }
      const result = await pool.query(
        "SELECT * FROM notifications WHERE lu = false ORDER BY date ASC"
      );
      const resulte = await pool.query("select nom_service from service"); //pour liste deroulante
      const nomsservice = resulte.rows.map((row) => row.nom_service);

      res.render("admin/medecin", {
        medecin: results.rows,
        notifications: result.rows,
        service: nomsservice,
      });
    }
  );
});

app.post("/add2", async (req, res) => {
  const {id, nom, specialite, tel, email,adresse } = req.body;
  const message = "Médecin a enregistré";
  hashedPassword = await bcrypt.hash(id, 10); //haashage du mot de passe et l'inserer dans users

  pool.query(
    `SELECT * FROM users1
      WHERE email = $1`,
    [email],
    async (err, results) => {
      if (err) {
        console.log(err);
      }
      console.log(results.rows);
      // si l'email existe déja
      if (results.rows.length > 0) {
        
        // si tout est OK 
      } else {
        
        try {
          await pool.query(
            "INSERT INTO medecin (id,nom, specialite, tel, email,adresse ) VALUES ($1, $2, $3, $4, $5, $6)",
            [id, nom, specialite, tel, email,adresse]
          );
      
          await pool.query(
            "INSERT INTO notifications (message, lu, date,nom) VALUES ($1, $2, $3,$4)",
            [message, false, new Date(),nom]
          );
         
          await pool.query("INSERT INTO users1 (email,password,nom) VALUES ($1, $2,$3)", 
          [
            email,
            hashedPassword,
            nom
          ]);          
      
          // Envoyer un e-mail à l'utilisateur
          const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
              user: "tobiemba@gmail.com",
              pass: "xfvilqzorefbeere", // autre  bvgofstrxorqoota
            },
          });
      
          const mailOptions = {
            from: "tobiemba@gmail.com",
            to: email,
            subject: "SERVICE DE SANTE +",
            text: `Bienvenu(e) Mr/Mme ${nom} merci de vous être enregistré en tant que Médecin votre mot de passe de connexion est ${id} 
             connectez vous appartir de ce lien http://localhost:4000/index_login1
            !`,
          };
      
          transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
              
            } else {
              console.log("E-mail envoyé au medecin : " + info.response);
            }
          });
          res.redirect(req.headers.referer);
        } catch (error) {
          console.error(error);
          
        }
      }
    }
  );
});

app.post("/edit2/:id", (req, res) => {
  const { id } = req.params;
  const { nom,specialite, tel, email,adresse } = req.body;
  pool.query(
    "UPDATE medecin SET nom = $1, specialite = $2, tel = $3, email=$4, adresse=$5 WHERE id = $6",
    [nom, specialite, tel, email,adresse, id],
    (error, results) => {
      if (error) {
        throw error;
      }
      res.redirect(req.headers.referer);
    }
  );
});

app.post("/delete2/:id", (req, res) => {
  const { id } = req.params;
  pool.query("DELETE FROM medecin WHERE id = $1", [id], (error, results) => {
    if (error) {
      throw error;
    }
    res.redirect(req.headers.referer);
  });
});
// supprimer notifications chez medecin si lu
app.post("/medecin_notification", async (req, res) => {
  const id = req.body.id;
  try {
    await pool.query("UPDATE notifications SET lu = true WHERE id = $1", [id]);
    res.redirect(req.headers.referer);
  } catch (err) {
    console.error(err);
    res.send("Error " + err);
  }
});

app.post("/marquer-lu", async (req, res) => {
  const id = req.body.id;
  try {
    await pool.query("UPDATE notifications SET lu = true WHERE id = $1", [id]);
    res.redirect(req.headers.referer);
  } catch (err) {
    console.error(err);
    res.send("Error " + err);
  }
});

// 5- gestion des infirmieres

app.get("/admin_infirmiere", async (req, res) => {
  pool.query(
    "SELECT * FROM infirmiere ORDER BY id ASC",
    async (error, results) => {
      if (error) {
        throw error;
      }
      const result = await pool.query(
        "SELECT * FROM notifications WHERE lu = false ORDER BY date ASC"
      );

      const infirmiere = results.rows;
      res.render("admin/infirmiere", {
        infirmiere: results.rows,
        notifications: result.rows,
      });
    }
  );
});

app.post("/add3", async (req, res) => {
  const { nom, prenom, portable, email} = req.body;

  try {
    await pool.query(
      "INSERT INTO infirmiere (nom, prenom, portable, email) VALUES ($1, $2, $3, $4)",
      [nom, prenom, portable, email]
    );
    res.redirect(req.headers.referer);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

app.post("/edit3/:id", (req, res) => {
  const { id } = req.params;
  const { nom, prenom, portable, email } = req.body;
  pool.query(
    "UPDATE infirmiere SET nom = $1, prenom = $2, portable = $3, email = $4 WHERE id = $5",
    [nom, prenom, portable, email, id],
    (error, results) => {
      if (error) {
        throw error;
      }
      res.redirect(req.headers.referer);
    }
  );
});

app.post("/delete3/:id", (req, res) => {
  const { id } = req.params;
  pool.query("DELETE FROM infirmiere WHERE id = $1", [id], (error, results) => {
    if (error) {
      throw error;
    }
    res.redirect(req.headers.referer);
  });
});

/// PARTIE DESTINEE AU PATIENT


app.get("/notification", (req, res) => {
  res.render("patient/notification");
});

/// PARTIE DESTINEE AU INFIRMIER

// PARTIE GESTION NOTIFICATION
// cette partie permet de recuperer les notification non lu=false et de les afficher
// elle permet egalement de supprimer les notification lu sur la bare grace à un update lu=true

// a) notifications vers l'administrateur
app.get("/", async (req, res) => {
  // notif vers index_admin
  pool.query(
    "SELECT * FROM infirmiere ORDER BY id ASC",
    async (error, results) => {
      if (error) {
        throw error;
      }
      const result = await pool.query(
        "SELECT * FROM notifications WHERE lu = false ORDER BY date ASC"
      );
      const result1 = await pool.query("SELECT * FROM medecin ORDER BY id ASC");
      const result2 = await pool.query("SELECT * FROM patient ORDER BY id ASC");
      res.render("admin/index", {
        infirmiere: results.rows,
        notifications: result.rows,
        medecin: result1.rows,
        patient: result2.rows,
      });
    }
  );
});

app.get("/admin_notification", async (req, res) => {
  // notif vers admin notifif
  try {
    const result = await pool.query(
      "SELECT * FROM notifications WHERE lu = false ORDER BY date DESC"
    );
    res.render("admin/notification", { notifications: result.rows });
  } catch (err) {
    console.error(err);
    res.send("Error " + err);
  }
});

// notifications vers Médecin



app.get("/medecin_message", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM notifications WHERE lu = false"
    );
    res.render("medecin/message", { notifications: result.rows });
  } catch (err) {
    console.error(err);
    res.send("Error " + err);
  }
});


app.get("/medecin_dossier", async (req, res) => {
  // notif vers admin
  try {
    const result = await pool.query(
      "SELECT * FROM notifications WHERE lu = false"
    );
    res.render("medecin/dossier", { notifications: result.rows });
  } catch (err) {
    console.error(err);
    res.send("Error " + err);
  }
});











app.post("/edit10/:id", (req, res) => {
   const { id } = req.params;
   let transporter; // Remplacer "const" par "let" pour la variable transporter
   const { resultat_analyse, resultat_radio } = req.body;
   const {email,tel} = req.body;
 
   pool.query(
     "UPDATE resultat SET resultat_analyse = $1, resultat_radio = $2 WHERE id = $3",
     [resultat_analyse, resultat_radio, id],
     () => {
       // Envoyer un e-mail à l'utilisateur
       transporter = nodemailer.createTransport({
         service: "gmail",
         auth: {
           user: "tobiemba@gmail.com",
           pass: "xfvilqzorefbeere", // autre  bvgofstrxorqoota
         },
       });

       const mailOptions = {
         from: "tobiemba@gmail.com",
         to: email, // Assurez-vous d'avoir défini la variable "email" auparavant
         subject: "Service de santé +",
         text: `Bonjour Mr\Mme ${resultat_radio}\n ${resultat_analyse} Merci pour votre disponibilité.`,
       };

       
       transporter.sendMail(mailOptions, (error, info) => {
         if (error) {
           throw error;
         } else {
           console.log("E-mail envoyé : " + info.response);
         }
       });

      res.redirect(req.headers.referer);
    }
  );
});

// GESTION DES REVISION SIMULTANNEE

app.post("/edit11/:id", (req, res) => {
  const { id } = req.params;
  let transporter; 
  const { medicament, rendez } = req.body;
  const {email} = req.body;

  pool.query(
    "UPDATE revisions SET medicament = $1, rendez = $2 WHERE id = $3",
    [medicament, rendez, id],
    () => {
      // Envoyer un e-mail à l'utilisateur
      transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: "tobiemba@gmail.com",
          pass: "xfvilqzorefbeere", // autre  bvgofstrxorqoota
        },
      });

      const mailOptions = {
        from: "tobiemba@gmail.com",
        to: email, // Assurez-vous d'avoir défini la variable "email" auparavant
        subject: "Service de santé +",
        text: `Bonjour Mr\Mme ${medicament},${rendez} Merci pour votre disponibilité.`,
      };
      
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          throw error;
        } else {
          console.log("E-mail envoyé : " + info.response);
        }
      });
     
     res.redirect(req.headers.referer);
   }
 );
});




app.post("/edit13/:id", (req, res) => {
  const { id } = req.params;
  const { soin} = req.body;
  const message = 'Nouveaux soins enregistrés'
  pool.query(
    "UPDATE soin SET soin = $1 WHERE id = $2",
    [soin, id],
    
    async (error, results) => {
      if (error) {
        throw error;
      }
      await pool.query(
        "INSERT INTO notifications (message, lu, date) VALUES ($1, $2, $3)",
        [message, false, new Date()]
      );
      res.redirect(req.headers.referer);
    }
  );
});



// notifications vers infirmiers

app.get("/index_infirmiere", async (req, res) => {
  // notif vers infirmiers
  try {
    const result = await pool.query(
      "SELECT * FROM notifications WHERE lu = false AND message ='Nouveaux soins enregistrés' ORDER BY date DESC "

    );

    res.render("infirmiere/index", { 
      notifications: result.rows ,
    });
  } catch (err) {
    console.error(err);
    res.send("Error " + err);
  }
});

app.get("/soin_infirmiere", async (req, res) => {
  // notif vers infirmiers
  try {
    const result = await pool.query(
      "SELECT * FROM notifications WHERE lu = false AND message ='Nouveaux soins enregistrés' ORDER BY date DESC "

    );
    const result1 = await pool.query(
      "SELECT * FROM soin "
    );
    
    res.render("infirmiere/soin", {
       notifications: result.rows, 
       soin:result1.rows
    });
  } catch (err) {
    console.error(err);
    res.send("Error " + err);
  }
});

app.get("/notification_infirmiere", async (req, res) => {
  // notif vers infirmiers
  try {
    const result = await pool.query(
      "SELECT * FROM notifications WHERE lu = false AND message ='Nouveaux soins enregistrés' ORDER BY date DESC "
    );
    res.render("infirmiere/notification", { notifications: result.rows });
  } catch (err) {
    console.error(err);
    res.send("Error " + err);
  }
});

/// MODULE SERVICES

// gestion des salles

app.get("/service_salle", (req, res) => {
  pool.query("SELECT * FROM salle ORDER BY id ASC", (error, results) => {
    if (error) {
      throw error;
    }
    const salle = results.rows;
    res.render("service/salle", { salle: salle });
  });
});

app.post("/add6", (req, res) => {
  const { salle } = req.body;
  pool.query(
    "INSERT INTO salle (numero) VALUES ($1)",
    [salle],
    (error, results) => {
      if (error) {
        throw error;
      }
      res.redirect(req.headers.referer);
    }
  );
});

app.post("/edit6/:id", (req, res) => {
  const { id } = req.params;
  const { numero } = req.body;
  pool.query(
    "UPDATE salle SET numero = $1  WHERE id = $2",
    [numero, id],
    (error, results) => {
      if (error) {
        throw error;
      }
      res.redirect(req.headers.referer);
    }
  );
});

app.post("/delete6/:id", (req, res) => {
  const { id } = req.params;
  pool.query("DELETE FROM salle WHERE id = $1", [id], (error, results) => {
    if (error) {
      throw error;
    }
    res.redirect(req.headers.referer);
  });
});

// gestion des lits

app.get("/service_lit", (req, res) => {
  pool.query("SELECT * FROM lit ORDER BY id ASC", (error, results) => {
    if (error) {
      throw error;
    }
    const lit = results.rows;
    res.render("service/lit", { lit: lit });
  });
});

app.post("/add7", (req, res) => {
  const { numero } = req.body;
  pool.query(
    "INSERT INTO lit (numero) VALUES ($1)",
    [numero],
    (error, results) => {
      if (error) {
        throw error;
      }
      res.redirect(req.headers.referer);
    }
  );
});

app.post("/edit7/:id", (req, res) => {
  const { id } = req.params;
  const { numero } = req.body;
  pool.query(
    "UPDATE lit SET numero = $1  WHERE id = $2",
    [numero, id],
    (error, results) => {
      if (error) {
        throw error;
      }
      res.redirect(req.headers.referer);
    }
  );
});

app.post("/delete7/:id", (req, res) => {
  const { id } = req.params;
  pool.query("DELETE FROM lit WHERE id = $1", [id], (error, results) => {
    if (error) {
      throw error;
    }
    res.redirect(req.headers.referer);
  });
});

// gestion des services

app.get("/service_service", (req, res) => {
  pool.query("SELECT * FROM service ORDER BY id ASC", (error, results) => {
    if (error) {
      throw error;
    }
    const service = results.rows;
    res.render("service/service", { service: service });
  });
});

app.post("/add8", (req, res) => {
  const { nom_service,description } = req.body;
  pool.query(
    "INSERT INTO service (nom_service,description) VALUES ($1,$2)",
    [nom_service,description],
    (error, results) => {
      if (error) {
        throw error;
      }
      res.redirect(req.headers.referer);
    }
  );
});

app.post("/edit8/:id", (req, res) => {
  const { id } = req.params;
  const { nom_service,description } = req.body;
  pool.query(
    "UPDATE service SET nom_service = $1,description=$2  WHERE id = $3",
    [nom_service,description, id],
    (error, results) => {
      if (error) {
        throw error;
      }
      res.redirect(req.headers.referer);
    }
  );
});

app.post("/delete8/:id", (req, res) => {
  const { id } = req.params;
  pool.query("DELETE FROM service WHERE id = $1", [id], (error, results) => {
    if (error) {
      throw error;
    }
    res.redirect(req.headers.referer);
  });
});

// AFFICHER LE DOSSIER MEDICAL

// pour recuperer
app.get("/admin_dossier", async (req, res) => {
  try {
    const results = await pool.query(
      "select * from admission order by date_admis asc"
    );
    const result = await pool.query("select nom_service from service"); //pour liste deroulante
    const nomsservice = result.rows.map((row) => row.nom_service);

    const result1 = await pool.query("select nom from medecin"); //pour liste deroulante
    const medecins = result1.rows.map((row) => [row.nom]);

    const result2 = await pool.query("select numero from lit"); //pour liste deroulante
    const lits = result2.rows.map((row) => row.numero);

    const result3 = await pool.query("select numero from salle"); //pour liste deroulante
    const salles = result3.rows.map((row) => row.numero);

    const result4 = await pool.query("select nom,prenom from garde"); //pour liste deroulante
    const gardes = result4.rows.map((row) => row.nom);
    const result5 = await pool.query("select nom,prenom from infirmiere"); //pour liste deroulante
    const infirmieres = result5.rows.map((row) => row.nom);
    res.render("admin/dossier", {
      admission: results.rows,
      services: nomsservice,
      medecins: medecins,
      lits: lits,
      salles: salles,
      gardes: gardes,
      infirmieres: infirmieres,
    });
  } catch (error) {
    throw error;
  }
});


app.post("/edit12/:id", (req, res) => {
  const { id } = req.params;
  const { admission} = req.body;
  pool.query(
    "UPDATE admission SET  diagnostique = $1 WHERE id = $2",
    [admission, id],
    (error, results) => {
      if (error) {
        throw error;
      }
      res.redirect(req.headers.referer);
    }
  );
});



app.post("/edit9/:id", (req, res) => {
  const { id } = req.params;
  const {
    nom,
    motif,
    diagnostique,
    date_admis,
    date_sortie,
    etat_sortie,
    medecin,
    infirmier,
    salle,
    lit,
    garde,
  } = req.body;

  pool.query(
    "UPDATE admission SET nom = $1, motif = $2, diagnostique = $3, date_admis = $4, date_sortie = $5, etat_sortie = $6, medecin = $7, infirmier = $8, salle = $9, lit = $10, garde = $11 WHERE id = $12",
    [
      nom,
      motif,
      diagnostique,
      date_admis,
      date_sortie,
      etat_sortie,
      medecin,
      infirmier,
      salle,
      lit,
      garde,
      id,
    ],
    (error, results) => {
      if (error) {
        throw error;
      }

      pool.query(
        "UPDATE revisions SET medecin = $1 WHERE id = $2",
        [medecin, id],
        (error, results) => {
          if (error) {
            throw error;
          }
        }
      );

      pool.query(
        "UPDATE soin SET medecin = $1,motif=$2  WHERE id = $3",
        [medecin,motif, id],
        (error, results) => {
          if (error) {
            throw error;
          }
        }
      );

      pool.query(
        "UPDATE resultat SET medecin = $1 WHERE id = $2",
        [medecin, id],
        (error, results) => {
          if (error) {
            throw error;
          }
          res.redirect(req.headers.referer);
        }
      );
    }
  );
});





//ajouter dossier medical cote admin

/// PARTIE AUTHENTIFICATION

app.use(
  session({
    secret: "secret",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 }, // 30 days
  })
);
app.get("/index_login", (req, res) => {
  res.render("login");
});

// Traitement du formulaire de connexion
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  // Requête SQL pour récupérer les informations de l'utilisateur avec l'e-mail donné
  pool.query(
    "SELECT * FROM users WHERE email = $1",
    [email],
    (error, results) => {
      if (error) {
        throw error;
      }

      if (results.rows.length > 0) {
        const user = results.rows[0];

        // Comparaison du mot de passe hashé avec le mot de passe fourni
        bcrypt.compare(password, user.password, (err, isMatch) => {
          if (err) {
            throw err;
          }

          if (isMatch) {
            // Ouverture d'une session
            req.session.user = user;
            res.redirect("index_patient");
          } else {
            res.redirect("index_login");
          }
        });
      } else {
        res.redirect("index_login");
      }
    }
  );
});

// Dashboard - Page après la connexion réussie

app.get("/index_patient", (req, res) => {
  if (req.session.user) {
     pool.query(
      `SELECT resultat.* FROM resultat
      JOIN users ON resultat.email = users.email
      WHERE users.email = $1`,
      [req.session.user.email],
      (error, results) => {
        if (error) {
          throw error;
        } else {
          res.render("patient/index", {
            user: req.session.user,
            resultat: results.rows
          });
        }
      }
    );
  } else {
    res.redirect("/index_login");
  }
});






app.get("/index_patient", async (req, res) => {
  if (req.session.user) {
    pool.query(
      `SELECT resultat.* FROM resultat
      JOIN users ON resultat.email = users.email
      WHERE users.email = $1`,
      [req.session.user.email],
      (error, results) => {
        if (error) {
          throw error;
        }
        res.render("patient/Resultats", {
          user: req.session.user,
          resultat: results.rows
        });
      }
    );
  } else {
    res.redirect("/index_login");
  }
});


// la session patient pour afficher les resultats examens
app.get("/Resultats", async (req, res) => {
  if (req.session.user) {
    pool.query(
      `SELECT resultat.* FROM resultat
      JOIN users ON resultat.email = users.email
      WHERE users.email = $1`,
      [req.session.user.email],
      (error, results) => {
        if (error) {
          throw error;
        }
        res.render("patient/Resultats", {
          user: req.session.user,
          resultat: results.rows
        });
      }
    );
  } else {
    res.redirect("/index_login");
  }
});

// la session patient pour afficher les la prescription et les  rendez-vous
app.get("/rendez", async (req, res) => {
  if (req.session.user) {
    pool.query(
      `SELECT revisions.* FROM revisions
      JOIN users ON revisions.email = users.email
      WHERE users.email = $1`,
      [req.session.user.email],
      (error, results) => {
        if (error) {
          throw error;
        }
        res.render("patient/rendez", {
          user: req.session.user,
          revisions: results.rows
        });
      }
    );
  } else {
    res.redirect("/index_login");
  }
});

// la session patient pour envoyer un message à un medecin

/// CETTE PARTIE PERMET D'ENVOYER DES EMAIL CHAQUE INTERVALLE DE TEMPS 1 seconde = 1000 unités
  
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "tobiemba@gmail.com",
    pass: "xfvilqzorefbeere", // autre  bvgofstrxorqoota
  },
});

// Fonction pour envoyer un email
const sendEmail = (nom, medicament,rendez, email) => {
  const mailOptions = {
    from: 'tobiemba@gmail.com',
    to: email,
    subject: 'SERVICE DE SANTE +',
    text: `Bonjour ${nom}, ${medicament} ${rendez}.`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
    } else {
      console.log('Email envoyé : ' + info.response);
    }
  });
};

// Fonction pour sélectionner chaque champ de la table et envoyer un email toutes 
const selectAndSendEmail = () => {
  const query = 'SELECT id, nom, medicament,rendez, email,tel FROM revisions';

  pool.query(query, (error, result) => {
    if (error) {
      console.log(error);
    } else {
      const rows = result.rows;
      rows.forEach((row) => {
        const { nom, medicament,rendez, email} = row;
        sendEmail(nom, medicament,rendez, email)
         
      });
    }
  });

  setTimeout(selectAndSendEmail, 8640000); // 24 heures = 24 * 60 * 60 = 86 400 secondes
  // on aura en tout 86 400 x 1000
};

// Démarrer le processus de sélection et d'envoi des emails
selectAndSendEmail();

///CODE POUR ENVOYER LES MESSAGE TELEPHONIQUE ASYNCRONE

// Fonction pour sélectionner les données et les envoyer via Twilio
const sendRevisions = () => {
  pool.query('SELECT medicament, rendez, tel FROM revisions', (error, result) => {
    if (error) {
      console.error('Erreur lors de la sélection des données :', error);
    }
  });
};

// Programme principal
setInterval(sendRevisions, 8640000); // Exécute sendRevisions toutes les 5 secondes




/// AUTHENTIFICATION SUPER USER

app.get("/index_login1", (req, res) => {
  res.render("login1");
});
app.get("/admin_login", (req, res) => {
  res.render("admin_login");
});
app.get("/infirmier_login", (req, res) => {
  res.render("login2");
});



app.get("/action_message", (req, res) => {

  if (req.session.user) {
    pool.query(
      `SELECT admission.* FROM admission
      JOIN users ON admission.nom = users.nom
      WHERE users.nom = $1`,
      [req.session.user.nom],
      (error, results) => {
        if (error) {
          throw error;
        }
        res.render("patient/action",{
          user: req.session.user,
          admission: results.rows
        });
      }
    );

    
  } else {
    res.redirect("/index_login");
  }
});

// Authentification Admin
app.post('/admin_login', async (req, res) => {
  const { email, password } = req.body;

  if (email === 'tobiemba@gmail.com' && password === '1234') {
    const results = await pool.query(
      "SELECT * FROM notifications WHERE lu = false ORDER BY date ASC"
    );
    const result1 = await pool.query("SELECT * FROM medecin ORDER BY id ASC");
    const result2 = await pool.query("SELECT * FROM patient ORDER BY id ASC");
    const result = await pool.query("SELECT * FROM notifications ORDER BY id ASC");
      res.render(
        'admin/index',
        {
          infirmiere: results.rows,
          notifications: result.rows,
          medecin: result1.rows,
          patient: result2.rows,
        }
      ); 
  } else {
      res.send('Identifiants invalides');
  }
});

app.post('/infirmier_login', async (req, res) => {
  const { email, password } = req.body;

  if (email === 'tobiemba@gmail.com' && password === '1234') {
    const results = await pool.query(
      "SELECT * FROM notifications WHERE lu = false ORDER BY date ASC"
    );
    const result1 = await pool.query("SELECT * FROM medecin ORDER BY id ASC");
    const result2 = await pool.query("SELECT * FROM patient ORDER BY id ASC");
    const result = await pool.query("SELECT * FROM notifications ORDER BY id ASC");
      res.render(
        'infirmiere/index',
        {
          infirmiere: results.rows,
          notifications: result.rows,
          medecin: result1.rows,
          patient: result2.rows,
        }
      ); 
  } else {
      res.send('Identifiants invalides');
  }
});

/// AUTHENTIFICATION DES MEDECINS
// Traitement du formulaire de connexion medecin
app.post("/login1", (req, res) => {
  const { email, password } = req.body;

  // Requête SQL pour récupérer les informations de l'utilisateur avec l'e-mail donné
  pool.query(
    "SELECT * FROM users1 WHERE email = $1",
    [email],
    (error, results) => {
      if (error) {
        throw error;
      }

      if (results.rows.length > 0) {
        const user = results.rows[0];

        // Comparaison du mot de passe hashé avec le mot de passe fourni
        bcrypt.compare(password, user.password, (err, isMatch) => {
          if (err) {
            throw err;
          }

          if (isMatch) {
            // Ouverture d'une session
            req.session.user = user;
            res.redirect("index_medecin");
          } else {
            res.redirect("index_login1");
          }
        });
      } else {
        res.redirect("index_login1");
      }
    }
  );
});

app.get("/index_medecin", async (req, res) => {
  if (req.session.user) {
    pool.query(
      `SELECT medecin.* FROM medecin
      JOIN users1 ON medecin.nom = users1.nom
      WHERE users1.nom = $1`,
      [req.session.user.nom],
      async (error, results) => {
        if (error) {
          throw error;
        }
        const result = await pool.query(
          `SELECT notifications.* FROM notifications 
         WHERE lu = false AND message ='Nouveau dossier médical crée' 
         ORDER BY date DESC`
        );
        res.render("medecin/index",{
          user: req.session.user,
          medecin: results.rows,
          notifications: result.rows,
        });
      }
    );
  } else {
    res.redirect("/index_login1");
  }
});


app.get("/message", (req, res) => {
  res.render("medecin/message");
});

// la session medecin pour afficher chaque patient
app.get("/patients", async (req, res) => {
  if (req.session.user) {
    pool.query(
      `SELECT admission.* FROM admission
      JOIN users1 ON admission.medecin = users1.nom
      WHERE users1.nom = $1`,
      [req.session.user.nom],
      (error, results) => {
        if (error) {
          throw error;
        }
        res.render("medecin/patients",{
          user: req.session.user,
          admission: results.rows
        });
      }
    );
  } else {
    res.redirect("/index_login1");
  }
});

app.get("/rendez-vous", (req, res) => {
  if (req.session.user) {
    pool.query(
      `SELECT revisions.* FROM revisions
      JOIN users1 ON revisions.medecin = users1.nom
      WHERE users1.nom = $1`,
      [req.session.user.nom],
      (error, results) => {
        if (error) {
          throw error;
        } else {
          res.render("medecin/rendez", {
            user: req.session.user,
            revisions: results.rows
          });
        }
      }
    );
  } else {
    res.redirect("/index_login1");
  }
});

app.get("/resultat", (req, res) => {
  if (req.session.user) {
    pool.query(
      `SELECT resultat.* FROM resultat
      JOIN users1 ON resultat.medecin = users1.nom
      WHERE users1.nom = $1`,
      [req.session.user.nom],
      (error, results) => {
        if (error) {
          throw error;
        } else {
          res.render("medecin/resultat", {
            user: req.session.user,
            resultat: results.rows
          });
        }
      }
    );
  } else {
    res.redirect("/index_login1");
  }
});


// la session medecin pour afficher chaque patient


// Gestion des soins
app.get("/soin", (req, res) => {
  if (req.session.user) {
    pool.query(
      `SELECT soin.* FROM soin
      JOIN users1 ON soin.medecin = users1.nom
      WHERE users1.nom = $1 AND motif='Hospitalisation'`,
      [req.session.user.nom],
      (error, results) => {
        if (error) {
          throw error;
        } else {
          res.render("medecin/soin", {
            user: req.session.user,
            soin: results.rows
          });
        }
      }
    );
  } else {
    res.redirect("/index_login1");
  }
});




// la session medecin pour afficher chaque patient
app.post("/edit15/:id", async(req, res) => {
    const { id } = req.params;
    const { diagnostique,etat_sortie } = req.body;
  pool.query(
    "UPDATE admission SET diagnostique = $1, etat_sortie=$2 WHERE id = $3",
    [diagnostique,etat_sortie, id],
    (error, results) => {
      if (error) {
        throw error;
      }
      res.redirect(req.headers.referer);
    }
  );
});


// la session medecin pour afficher ses notifications

app.get("/medecin_notification", async (req, res) => {
  if (req.session.user) {
    try {
      const results = await pool.query(
        `SELECT notifications.* FROM notifications 
         WHERE lu = false AND message ='Nouveau dossier médical crée' 
         ORDER BY date DESC`
      );

      res.render("medecin/notification", {
        user: req.session.user,
        notifications: results.rows
      });
    } catch (error) {
      throw error;
    }
  } else {
    res.redirect("/index_login1");
  }
});



// Route pour effectuer la recherche
app.post('/search', async (req, res) => {
  const { nom } = req.body;
  const query = {
    text: 'SELECT * FROM admission WHERE nom ILIKE $1',
    values: [`%${nom}%`],
  };

  const result = await pool.query("select nom_service from service"); //pour liste deroulante
    const nomsservice = result.rows.map((row) => row.nom_service);

    const result1 = await pool.query("select nom from medecin"); //pour liste deroulante
    const medecins = result1.rows.map((row) => [row.nom, row.prenom]);

    const result2 = await pool.query("select numero from lit"); //pour liste deroulante
    const lits = result2.rows.map((row) => row.numero);

    const result3 = await pool.query("select numero from salle"); //pour liste deroulante
    const salles = result3.rows.map((row) => row.numero);

    const result4 = await pool.query("select nom,prenom from garde"); //pour liste deroulante
    const gardes = result4.rows.map((row) => [row.nom, row.prenom]);
    const result5 = await pool.query("select nom,prenom from infirmiere"); //pour liste deroulante
    const infirmieres = result5.rows.map((row) => [row.nom, row.prenom]);

  pool.query(query, (err, results) => {
    if (err) {
      console.error(err);
      res.send('Une erreur est survenue lors de la recherche.');
    } else {
      res.render("admin/dossier", {
        admission: results.rows,
        services: nomsservice,
        medecins: medecins,
        lits: lits,
        salles: salles,
        gardes: gardes,
        infirmieres: infirmieres,
      });
    }
  });
});

app.post('/search2', async (req, res) => {
  const { infirmier } = req.body;
  const query = {
    text: 'SELECT * FROM soin WHERE infirmier ILIKE $1',
    values: [`%${infirmier}%`],
  };
  const result = await pool.query(
    "SELECT * FROM notifications WHERE lu = false ORDER BY date DESC"
  );
  pool.query(query, (err, results) => {
    if (err) {
      console.error(err);
      res.send('Une erreur est survenue lors de la recherche.');
    } else {
      res.render("infirmiere/soin", {
        soin: results.rows,
        notifications: result.rows,
      });
    }
  });
});


/// ENVOI MESSAGE AU MEDECINIONS

async function migrateDatabase() {
  const client = await pool.connect();
  
  const query = `
    CREATE TABLE IF NOT EXISTS public.admission (
      id TEXT PRIMARY KEY,
      nom TEXT,
      motif TEXT,
      diagnostique TEXT,
      date_admis TEXT,
      date_sortie TEXT,
      etat_sortie TEXT,
      medecin TEXT,
      infirmier TEXT,
      salle TEXT,
      lit TEXT,
      garde TEXT
    );

    CREATE TABLE IF NOT EXISTS public.garde (
      id BIGSERIAL PRIMARY KEY,
      nom TEXT,
      prenom TEXT,
      lien TEXT,
      adresse TEXT,
      tel TEXT,
      date_debut TEXT,
      date_fin TEXT
    );

    CREATE TABLE IF NOT EXISTS public.infirmiere (
      id BIGSERIAL PRIMARY KEY,
      nom TEXT,
      prenom TEXT,
      portable TEXT,
      email TEXT,
      photo BYTEA
    );

    CREATE TABLE IF NOT EXISTS public.lit (
      id BIGSERIAL PRIMARY KEY,
      numero TEXT
    );

    CREATE TABLE IF NOT EXISTS public.medecin (
      id SERIAL PRIMARY KEY,
      nom TEXT,
      specialite TEXT,
      tel TEXT,
      email TEXT,
      adresse TEXT
    );

    CREATE TABLE IF NOT EXISTS public.notifications (
      id BIGSERIAL PRIMARY KEY,
      message TEXT,
      lu BOOLEAN,
      date TIMESTAMP,
      nom TEXT
    );

    CREATE TABLE IF NOT EXISTS public.patient (
      id TEXT PRIMARY KEY,
      nom TEXT,
      datenaiss TEXT,
      sexe TEXT,
      tel TEXT,
      cni TEXT,
      service TEXT,
      email TEXT
    );

    CREATE TABLE IF NOT EXISTS public.resultat (
      id TEXT PRIMARY KEY,
      nom TEXT,
      resultat_analyse TEXT,
      resultat_radio TEXT,
      email TEXT,
      tel TEXT,
      medecin TEXT,
      service TEXT
    );

    CREATE TABLE IF NOT EXISTS public.revisions (
      id TEXT PRIMARY KEY,
      nom TEXT,
      medicament TEXT,
      rendez TEXT,
      email TEXT,
      tel TEXT,
      medecin TEXT,
      service TEXT
    );

    CREATE TABLE IF NOT EXISTS public.salle (
      id BIGSERIAL PRIMARY KEY,
      numero TEXT
    );

    CREATE TABLE IF NOT EXISTS public.service (
      id BIGSERIAL PRIMARY KEY,
      nom_service TEXT,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS public.soin (
      id TEXT PRIMARY KEY,
      nom TEXT,
      soin TEXT,
      salle TEXT,
      lit TEXT,
      infirmier TEXT,
      medecin TEXT,
      motif TEXT
    );

    CREATE TABLE IF NOT EXISTS public.users (
      id BIGSERIAL PRIMARY KEY,
      email TEXT,
      password TEXT,
      nom TEXT
    );

    CREATE TABLE IF NOT EXISTS public.users1 (
      id BIGSERIAL PRIMARY KEY,
      email TEXT,
      password TEXT,
      nom TEXT
    );
  `;

  try {
    await client.query(query);
    console.log("Tables migrées avec succès !");
  } catch (error) {
    console.error("Erreur lors de la migration :", error);
  } finally {
    client.release();
  }
}

// Lancer la migration lors du démarrage du serveur
migrateDatabase();



app.listen(4000, function () {
  console.log("Server started on port 4000");
});
