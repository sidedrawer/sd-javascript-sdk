import { AxiosResponse } from 'axios';
import config from '../config.json';
import BaseService from './base-service';
import { SideDrawerMain, SidedrawerNetworkDto, RecordNetworkDto, TransferOwnershipDto } from '../types';


export interface INetworkService {
    getTimeline(sidedrawer_id: string, type: string, locale: string, page: number): Promise<AxiosResponse<any>>;

    getShared(): Promise<AxiosResponse<SideDrawerMain[]>>;

    getOwned(): Promise<AxiosResponse<SideDrawerMain[]>>;

    remove(sidedrawer_id: string): Promise<AxiosResponse<any>>;

    removeById(sidedrawer_id: string, network_id: string): Promise<AxiosResponse<any>>;

    createSidedrawerNetwork(sidedrawer_id: string, record_id: string, sidedrawerNetwork: SidedrawerNetworkDto): Promise<AxiosResponse<{ id: string }>>;

    updateSidedrawerNetwork(sidedrawer_id: string, record_id: string, sidedrawerNetwork: SidedrawerNetworkDto): Promise<AxiosResponse<any>>;

    createRecordNetwork(sidedrawer_id: string, record_id: string, network_id: string, recordNetworkDto: RecordNetworkDto): Promise<AxiosResponse<{ id: string }>>;

    updateRecordNetwork(sidedrawer_id: string, record_id: string, network_id: string, recordNetworkDto: RecordNetworkDto): Promise<AxiosResponse<any>>;

    createTransferSideDrawerOwnership(sidedrawer_id: string, transferOwnershipDto: TransferOwnershipDto): Promise<AxiosResponse<any>>;
}

export default class NetworkService extends BaseService implements INetworkService {
    constructor() {
        super(config.apiNetwork);

    }

    getTimeline = async (sidedrawer_id: string, type: string, locale: string, page: number): Promise<AxiosResponse<any>> => {

        return this.get(`sidedrawer/sidedrawer-id/${sidedrawer_id}/log?locale==${locale}&page=${page}&entityType=${type}`);

    };

    getShared = async (): Promise<AxiosResponse<SideDrawerMain[]>> => {

        return this.get<SideDrawerMain[]>(`sidedrawer/shared`);
    };

    getOwned = async (): Promise<AxiosResponse<SideDrawerMain[]>> => {

        return this.get<SideDrawerMain[]>(`sidedrawer/owned`);
    };

    remove = async (sidedrawer_id: string): Promise<AxiosResponse<any>> => {

        return this.delete(`sidedrawer/sidedrawer-id/${sidedrawer_id}/network`);
    };

    removeById = async (sidedrawer_id: string, network_id: string): Promise<AxiosResponse<any>> => {

        return this.delete(`sidedrawer/sidedrawer-id/${sidedrawer_id}/network/network-id/${network_id}`);
    };


    createSidedrawerNetwork = async (sidedrawer_id: string, record_id: string, sidedrawerNetwork: SidedrawerNetworkDto): Promise<AxiosResponse<{ id: string }>> => {

        return this.post<{ id: string }>(`sidedrawer/sidedrawer-id/${sidedrawer_id}/record/record-id/${record_id}/network`, sidedrawerNetwork);
    };

    updateSidedrawerNetwork = async (sidedrawer_id: string, record_id: string, sidedrawerNetwork: SidedrawerNetworkDto): Promise<AxiosResponse<any>> => {

        return this.put(`sidedrawer/sidedrawer-id/${sidedrawer_id}/record/record-id/${record_id}/network`, sidedrawerNetwork);

    };

    createRecordNetwork = async (sidedrawer_id: string, record_id: string, network_id: string, recordNetworkDto: RecordNetworkDto): Promise<AxiosResponse<{ id: string }>> => {

        return this.post<{ id: string }>(`sidedrawer/sidedrawer-id/${sidedrawer_id}/record/record-id/${record_id}/network/network-id/${network_id}`, recordNetworkDto);
    };

    updateRecordNetwork = async (sidedrawer_id: string, record_id: string, network_id: string, recordNetworkDto: RecordNetworkDto): Promise<AxiosResponse<any>> => {

        return this.put(`sidedrawer/sidedrawer-id/${sidedrawer_id}/record/record-id/${record_id}/network/network-id/${network_id}`, recordNetworkDto);

    };

    createTransferSideDrawerOwnership = async (sidedrawer_id: string, transferOwnershipDto: TransferOwnershipDto): Promise<AxiosResponse<any>> => {

        return this.post(`sidedrawer/sidedrawer-id/${sidedrawer_id}/transfer`, transferOwnershipDto);
    };

}


