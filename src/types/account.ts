import { Settings } from './settings'
import { PrimaryResidence } from './primaryResidence'
import { Email } from './email'
import { Agreement } from './agreement'
import { Phone } from './phone'


export interface Account {
    id?: string,
    username?: string,
    firstName?: string,
    lastName?: string,
    profilePhoto?: string,
    dateOfBirth?: string,
    maritalStatus?: string,
    primaryResidence?: PrimaryResidence,
    gender?: string,
    emails?: Email[],
    phones?: Phone[],
    settings?: Settings,
    agreements?: Agreement[],
    openId?: string,
    customerId?: string

}