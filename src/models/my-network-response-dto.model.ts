import {Network} from './network.model';

export class MyNetworkResponseDto {
  constructor(
    public name?: string,
    public email?: string,
    public openId?: string,
    public phoneNumber?: string,
    public profilePhoto?: string,
    public network?: Network[],
    public teamId?: string,
    public teamLogo?: string,
    public teamName?: string,
  ) {
  }
}
