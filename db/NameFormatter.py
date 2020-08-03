filename = 'yob2018.txt'
updateInterval = 1000
popularityToNames = {}

class Name:

    def __init__(self, line):
        name, genderChar, pop = line.strip().split(',')
        
        self.name = name.lower()
        self.isMale = int(genderChar == 'M') #sqlite doens't have bools
        self.pop = int(pop)
        self.rank = None
        self.creator = "<default>"


    def __str__(self):
        return ",".join((str(x) for x in (
            self.name,
            self.isMale,
            self.pop,
            self.rank,
            self.creator
        )))

    
class Aggregate:

    def __init__(self):
        self._dic = {}

    def add(self, key, val):
        if key in self._dic:
            self._dic[key].append(val)
        else:
            self._dic[key] = [val]
            
    def getElements(self):
        for elementList in self._dic.values():
            for element in elementList:
                yield element


class NameAggregate(Aggregate):

    def __init__(self):
        super().__init__()
        self.totalPop = 0

    def assignPopularity(self):
        
        keysOrdered = sorted(self._dic)
        
        for rank in range(1, len(keysOrdered)+1):

            index = -rank
            key = keysOrdered[index]
            
            for nameObj in self._dic[key]:

                nameObj.rank = rank

                
writeLine = lambda line, wf: wf.write(line + '\n')

if __name__=='__main__':
    with open(filename, encoding='utf-8') as rf,\
        open(filename+'.formatted', 'w', encoding='utf-8') as wf:
        
        line = rf.readline()
        i = 0
        maleNameAggregate = NameAggregate()
        femaleNameAggregate = NameAggregate()
        
        while line:
            
            i+=1
            if i%updateInterval == 0: print(f'line number: {i}')

            nameObj = Name(line)
            nameAggregate = maleNameAggregate if nameObj.isMale else femaleNameAggregate
            nameAggregate.add(nameObj.pop, nameObj)           

            line = rf.readline()
            
        maleNameAggregate.assignPopularity()
        femaleNameAggregate.assignPopularity()

        for maleName in maleNameAggregate.getElements():
            writeLine(str(maleName), wf)

        for femaleName in femaleNameAggregate.getElements():
            writeLine(str(femaleName), wf)

        print(f'done, {i} lines')
