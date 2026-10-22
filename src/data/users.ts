import type { User } from "./types";

export const listenerUser: User = {
  id: "u1",
  name: "Amani Kariuki",
  email: "amani@plugg.fm",
  accountType: "listener",
  avatarUrl: "c3",
};

export const artistUser: User = {
  id: "u2",
  name: "Zuri Mwangi",
  email: "zuri@plugg.fm",
  accountType: "artist",
  avatarUrl: "c2",
  artistId: "a1",
};

export const users: User[] = [listenerUser, artistUser];
