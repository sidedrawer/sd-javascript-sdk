export class Team {
  constructor(
    public active?: boolean,
    public name?: string,
    public logo?: string,
    public tenant?: string,
    public owner?: string,
    public createdAt?: Date,
    public updatedAt?: Date,
    public id?: string,
  ) {
  }
}
