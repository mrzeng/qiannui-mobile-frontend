import {Button,ListView, Modal} from 'nuke';
import {mount} from 'nuke-mounter';
import {createElement, Component} from 'weex-rx';
import { View, Text, TouchableHighlight,ScrollView } from 'nuke-components';
import { getAuthSign,getAdgroupsAll,getallKeywords ,deleteKeywords} from '../api';
import QN from 'QAP-SDK';
import Async from 'async';
import _ from 'lodash';

let URL= document.URL;
let arr= QN.uri.parseQueryString(URL.split('?')[1]);
const campaign_id = arr.campaign_id;
const title = arr.title;
var obj = {};
class HealthyResult extends Component{
    constructor() {
        super();   
        this.state = {
            subway_token:'',
            adgroups:[],
            normal_val:'正常',
            too_low:'过低',
            littleKeycount:0,
            garbageCount:0,
            qscoreLowerCount:0,
            noImpressionsCount:0,
            loading:false,
            disabled:false,
            buttonText:'删除'
        }   
        this.makeKeywordFunc = this.makeKeywordFunc.bind(this);
        this.renderItem = this.renderItem.bind(this);
        this.formatKeywords = this.formatKeywords.bind(this);
    }

    componentWillMount(){
        var self = this;
        getAuthSign().then((result) => {
       
            self.setState({subway_token:result});

            getAdgroupsAll(campaign_id).then((result) => {
                self.setState({adgroups:result});

                self.renderItem();
           
        }, (error) => {
          
        });
         
        });
    }
    makeKeywordFunc(adgroup,subway_token){
        var self = this;
        var keywordsObj = {};
        
        if(keywordsObj.adgroup === undefined){
            keywordsObj.adgroup = adgroup;
        }

        return function(callback){
           
            getallKeywords(subway_token,adgroup.adgroup_id,adgroup.campaign_id,false).then((result) => {
                  
                if(result.keylist){
                    var keyword = result.keylist;

                    if(undefined === keywordsObj.keyword){
                        keywordsObj.keyword = [];
                    }

                    if(undefined === keywordsObj.baserpt){
                        keywordsObj.baserpt = [];
                    }

                    if(keyword.length >0){
                        keywordsObj.keyword = keyword;
                        keywordsObj.baserpt = result.rptbase;
                    }

                  callback(null,self.formatKeywords(keywordsObj));
                }
            }, (error) => {  
                   callback(error,null);
            }); 
        }
    }

    formatKeywords(keywordsObj){
        var self = this;
    
        var defaultObj = {garbageCount:0,garbagekeyids:{},littleKeycount:0,littleKeyGroup:{},qscoreLowerCount:0,qscoreLowerkeyids:{},noImpressionsCount : 0,noImpressionskeyids:{}};//所有关键词列表
            if(keywordsObj.adgroup === null || keywordsObj.adgroup === undefined){
                return;
            }

            var adgroup = keywordsObj.adgroup;

            if(obj.garbageCount === undefined){
                obj = defaultObj;
            }
            var len = keywordsObj.keyword.length;
          

            //关键词少于10个
            if(len < 10){
                obj.littleKeycount ++; //展示少于十个词的推广组（宝贝）  少于10个词的宝贝 （1）个  检测中(绿色字体) 最终加词
                self.setState({littleKeycount:obj.littleKeycount});

                if (obj.littleKeyGroup[adgroup.adgroup_id] === undefined){
                    obj.littleKeyGroup[adgroup.adgroup_id] = {};
                }
                obj.littleKeyGroup[adgroup.adgroup_id].base = adgroup;
                obj.littleKeyGroup[adgroup.adgroup_id].keyword = [];
               
                //同时将少于10个词的宝贝数据展示出来 
               // self.showProduct(keywordsObj);//todo 
            }

            if(len >0){
                var keyword = keywordsObj.keyword;
                for(var t in keyword){
                    if(obj.littleKeyGroup[adgroup.adgroup_id] && obj.littleKeyGroup[adgroup.adgroup_id].keyword){
                        obj.littleKeyGroup[adgroup.adgroup_id].keyword.push(keyword[t].word);
                    }

                    //垃圾词 （垃圾词是近期无点击的词）
                    var keyparm = {};
                    keyparm[keyword[t].keyword_id] = keyword[t].max_price;//为了提价准备

                    if (obj.garbagekeyids[keyword[t].campaign_id] === undefined){
                        obj.garbagekeyids[keyword[t].campaign_id] = [];
                    }
                    //（垃圾词是近期无点击的词）
                    if(keyword[t].is_garbage ){
                        obj.garbageCount++;//展示垃圾词     垃圾词（1）个   检测中（绿色字体） 最终删除
                        obj.garbagekeyids[keyword[t].campaign_id].push(keyparm);
                        self.setState({garbageCount:obj.garbageCount});  
                    }

                    //无展现的词
                    if (obj.qscoreLowerkeyids[keyword[t].campaign_id] === undefined){
                        obj.qscoreLowerkeyids[keyword[t].campaign_id] = [];
                    }

                    //质量得分小于3分的词
                    if(parseInt(keyword[t].qscore) <= 3){

                        obj.qscoreLowerCount++;
                        obj.qscoreLowerkeyids[keyword[t].campaign_id].push(keyword[t].keyword_id);
                        self.setState({qscoreLowerCount: obj.qscoreLowerCount});
                    }
                }

                //基础报表获取无展现的关键词
                if(keywordsObj.baserpt && keywordsObj.baserpt.length >0){
                    if (obj.noImpressionskeyids[adgroup.campaign_id] === undefined){
                       obj.noImpressionskeyids[adgroup.campaign_id] = [];
                    }

                    for(var j in keywordsObj.baserpt) {
                        var pv = parseInt(keywordsObj.baserpt[j].impressions);

                        if(pv === 0){
                            obj.noImpressionsCount++;//无展现的关键词添加
                            obj.noImpressionskeyids[adgroup.campaign_id].push(keywordsObj.baserpt[j].keyword_id);
                            self.setState({noImpressionsCount:obj.noImpressionsCount});
                        }
                    }
                }
            }
          return obj;
    }
    renderItem(){
        var adgroups = this.state.adgroups;
        var adgroupsArr = [],data = [];
       
        var self = this;
     
        if(adgroups.length > 0 && this.state.subway_token){

                for (let j in  adgroups){
                    adgroupsArr.push(self.makeKeywordFunc(adgroups[j],self.state.subway_token));   
                }
                Async.parallelLimit(adgroupsArr,2, (err, res) => {
                   let data = res;
                   console.log(JSON.stringify(data));
                });
        }

    }
    deleteGarbase(){
        var self = this;
        var keyword = [];
     
        if(self.state.garbageCount > 0 && obj.garbagekeyids[campaign_id]) {

            var val = obj.garbagekeyids[campaign_id];
            for( var i in val)
            {
                keyword.push(parseInt(_.keys(val[i])[0]));
            }

            // 删除垃圾关键词
            deleteKeywords(campaign_id,keyword).then((result)=>{
                Modal.toast('删除成功');
                self.setState({garbageCount:0, loading:false, disabled:false,buttonText:'删除'});
            });
        }
    }

    deleteQsource(){
        var self = this;
        var keyword = [];
      
        if(self.state.qscoreLowerCount > 0 && obj.qscoreLowerkeyids[campaign_id]) {
            keyword = obj.qscoreLowerkeyids[campaign_id];

             deleteKeywords(campaign_id,keyword).then((result)=>{
                Modal.toast('删除成功');
                self.setState({qscoreLowerCount:0, loading:false, disabled:false,buttonText:'删除'});
            });
        }

    }

    deleteNoImpressions(){
        var self = this;
        var keyword = [];
   
        if(self.state.noImpressionsCount > 0 && obj.noImpressionskeyids[campaign_id]) {
              keyword = obj.noImpressionskeyids[campaign_id];
              deleteKeywords(campaign_id,keyword).then((result)=>{
                Modal.toast('删除成功');
                self.setState({noImpressionsCount:0, loading:false, disabled:false,buttonText:'删除'});
            });
        }
    }
    press(type){
        var self = this;
        switch(type){
            case 'garbage': //删除垃圾关键词
             
                  Modal.confirm('确定删除垃圾关键词吗?',[ 
                    {
                        onPress:(e)=>{
                            self.setState({loading:true,buttonText:'删除中...'});
                            self.deleteGarbase();
                        },
                        text:"确定"
                    },
                    {
                        onPress:()=>{

                        },
                        text:"取消"
                    }
                ]);

                break;
            case 'qsource': //删除质量得分低的

                Modal.confirm('确定删除质量分低的关键词吗?',[ 
                    {
                        onPress:(e)=>{
                            self.setState({loading:true,buttonText:'删除中...'});
                             self.deleteQsource();
                        },
                        text:"确定"
                    },
                    {
                        onPress:()=>{

                        },
                        text:"取消"
                    }
                ]);
                break;
            case 'noImpressions':

                Modal.confirm('确定删除无展现的关键词吗?',[ 
                    {
                        onPress:(e)=>{
                            self.setState({loading:true,buttonText:'删除中...'});
                            self.deleteNoImpressions();
                        },
                        text:"确定"
                    },
                    {
                        onPress:()=>{

                        },
                        text:"取消"
                    }
                ]);
                break;
        }
    }
    render(){
        var self = this;
        return (
             <ScrollView style={style.scroller} >
                <View>
                    {
                        self.state.qscoreLowerCount == 0 ? '':
                            <View style={style.item}>
                            <Text style={style.text} >质量分少于3分：{self.state.qscoreLowerCount}个</Text>
                            <Button style={style.button} onPress={this.press.bind(this,'qsource')} type="primary">删除</Button>
                            </View>
                    }  

                    {
                       self.state.garbageCount == 0 ? '':
                            <View style={style.item}>
                            <Text style={style.text} >垃圾词：{self.state.garbageCount}个</Text>
                            <Button style={style.button} onPress={this.press.bind(this,'garbage')} type="primary">删除</Button>
                            </View> 
                    }
                           
                    {
                        self.state.noImpressionsCount == 0 ? '':
                            <View style={style.item}>
                            <Text style={style.text}>无展现关键词：{self.state.noImpressionsCount}个</Text>
                            <Button style={style.button} onPress={this.press.bind(this,'noImpressions')} type="primary">删除</Button>
                            </View>  
                    }  

                    {
                        self.state.littleKeycount == 0 ? '':
                            <View style={style.item}>
                            <Text style={style.text}>少于10个词的宝贝：{self.state.littleKeycount}个</Text>
                            <Button style={style.button} onPress={this.press.bind(this,"showItems")} type="primary">查看</Button>
                            </View>
                    }
                    </View>
            </ScrollView>
            )
    }
}
const style={
    scroller:{
      backgroundColor:'#ffffff'
    },
    item:{
        height:'90rem',
        borderBottomStyle:'solid',
        borderBottomWidth:'1rem',
        borderBottomColor:'#e8e8e8',
        paddingLeft:"30rem",
        flexDirection:"row",
        alignItems:"center",
        display:'flex' 
    },
    text:{
        padding:'20rem 40rem',
        flex:15
    },
    button:{
        flex: 4,
        padding:'20rem 40rem'
      
    }
}

mount(<HealthyResult />, 'body');
export default HealthyResult