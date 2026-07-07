export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  stamps: number;
  points: number;
  joined: string;
  lastVisit: string;
}

export const mockClients: Client[] = [
  { id: "c1", name: "Amina Traoré", email: "amina.t@gmail.com", phone: "06 12 34 56 78", stamps: 8, points: 320, joined: "12 Jan 2026", lastVisit: "Il y a 2 jours" },
  { id: "c2", name: "Julien Marchand", email: "j.marchand@outlook.com", phone: "06 22 11 90 43", stamps: 3, points: 140, joined: "03 Fév 2026", lastVisit: "Il y a 5 jours" },
  { id: "c3", name: "Sofia Rossi", email: "sofia.rossi@yahoo.fr", phone: "07 45 33 21 09", stamps: 10, points: 610, joined: "28 Nov 2025", lastVisit: "Aujourd'hui" },
  { id: "c4", name: "Karim Benali", email: "karim.benali@gmail.com", phone: "06 98 12 34 55", stamps: 5, points: 210, joined: "15 Déc 2025", lastVisit: "Il y a 1 semaine" },
  { id: "c5", name: "Lucie Petit", email: "lucie.petit@gmail.com", phone: "07 33 44 22 11", stamps: 1, points: 40, joined: "01 Juil 2026", lastVisit: "Hier" },
  { id: "c6", name: "Mehdi Cherif", email: "mehdi.cherif@gmail.com", phone: "06 77 88 99 00", stamps: 9, points: 480, joined: "20 Oct 2025", lastVisit: "Il y a 3 jours" },
];
